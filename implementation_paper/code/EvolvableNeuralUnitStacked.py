import numpy as np
from torch.nn import init

from AbstractLayerBMM import AbstractLayerBMM, trelu, sigmoid, tanh, hard_tanh

np.random.seed(0)
import torch
torch.random.manual_seed(0)


class EvolvableNeuralUnitStacked(AbstractLayerBMM):
    """Evolvable Neural Unit (ENU) implementation in PyTorch using batch matrix multiplication on all offspring"""

    def __init__(self, n_offspring, batch_size, n_input, n_dynamic_param, n_output, n_layers=0):
        super().__init__(n_offspring, batch_size, n_input, n_output)
        self.input_layer = GRU(n_offspring, batch_size, n_input + n_output, n_dynamic_param)
        # optional multi layer ENU if n_layers>0
        self.hidden_layers = [GRU(n_offspring, batch_size, n_dynamic_param, n_dynamic_param) for _ in range(n_layers)]
        self.output_layer = SimpleLayer(n_offspring, batch_size, n_dynamic_param, n_output)
        # store output in memory, since we need to feed it back next time step
        self.out_mem = torch.zeros((n_offspring, batch_size, n_output), device='cuda', dtype=torch.float32)
        # trainable parameters
        self.trainable_layers = self.input_layer.trainable_layers + self.output_layer.trainable_layers
        for layer in self.hidden_layers:
            self.trainable_layers.extend(layer.trainable_layers)
        self.reset()
        self.spike_output = False

    def dump_model(self, e, exp_name):
        pass

    def restore_model(self, e, exp_name):
        pass

    def dump_network_activity(self, e, exp_name):
        pass

    def plot_network(self, e, exp_name):
        pass

    def reset(self):
        self.input_layer.reset()
        for hidden_layer in self.hidden_layers:
            hidden_layer.reset()
        self.output_layer.reset()
        #NOTE: critical! else we re-use information from previous generation, makes evolution very unstable
        self.out_mem.fill_(0)

    def forward(self, X):
        if isinstance(X, np.ndarray):
            X = torch.from_numpy(X.astype(np.float32)).cuda()
        # concat previous output of final layer back to input
        X = torch.cat([X, self.out_mem], dim=-1)
        h1 = self.input_layer.forward(X)
        for hidden_layer in self.hidden_layers:
            h1 = hidden_layer.forward(h1)
        out = self.output_layer.forward(h1)
        # NOTE: add same noise to All offspring? ensures fair comparison ? but less robust to variations maybe
        # NOTE: need in global network since we have competition between neurons, but not in singular model
        if self.batch_size > 1:
            out += torch.randn(size=(self.n_offspring, self.batch_size, out.shape[2]), device='cuda', dtype=torch.float32) * 0.01
        # increase output slope to make learning spiking patterns easier
        if self.spike_output:
            self.out = trelu(1000*out)
        else:
            self.out = trelu(out)
        #store in memory for next time step
        self.out_mem.copy_(self.out)
        return self.out

    def get_output_(self):
        out_np = super().get_output_()
        out_np = out_np[:, :, 0]
        return out_np.reshape(self.out.shape[0], 1)


class GRU(AbstractLayerBMM):
    """Batch 3D matrix multiplication GRU implementation that ENU extends on"""
    def __init__(self, n_offspring, batch_size, n_input, n_dynamic_param, reset_gate=True):
        super().__init__(n_offspring, batch_size, n_input, n_dynamic_param)
        self.n_gates = 2
        self.gates = LinearLayerBMM(n_offspring, batch_size, n_input + n_dynamic_param + 1, n_dynamic_param * self.n_gates, n_chunks=self.n_gates)
        self.cell_gate = LinearLayerBMM(n_offspring, batch_size, n_input + n_dynamic_param + 1, n_dynamic_param)
        self.cell_state = torch.zeros((n_offspring, batch_size, n_dynamic_param), device='cuda', dtype=torch.float32)
        self.trainable_layers = [self.gates, self.cell_gate]
        self.reset_gate = reset_gate
        self.reset()

    def reset(self):
        self.gates.reset()
        self.cell_gate.reset()
        self.cell_state.fill_(0)

    def forward(self, X):
        if isinstance(X, np.ndarray):
            X = torch.from_numpy(X.astype(np.float32)).cuda()
        # concatenate output spike to input
        bias = torch.ones(size=(X.shape[0], X.shape[1], 1), device='cuda', dtype=torch.float32)
        X_gates = torch.cat([X, self.cell_state, bias], dim=-1)
        gates = self.gates.forward(X_gates)
        reset_gate, update_gate = gates.chunk(self.n_gates, -1)
        reset_gate, update_gate = sigmoid(reset_gate - 1), sigmoid(update_gate)
        if self.reset_gate:
            X_gates = torch.cat([X, self.cell_state * reset_gate, bias], dim=-1)
        cell_gate = self.cell_gate.forward(X_gates, activation_function=tanh)
        # update cell state
        new_cell_state = (1-update_gate) * self.cell_state + update_gate * cell_gate
        # store for next step
        self.cell_state.copy_(new_cell_state)
        self.out = self.cell_state
        return self.out


class SimpleLayer(AbstractLayerBMM):
    """Batch 3D matrix multiplication of simple feedforward layer"""
    def __init__(self, n_offspring, batch_size, n_input, n_output):
        super().__init__(n_offspring, batch_size, n_input, n_output)
        self.output_layer = LinearLayerBMM(n_offspring, batch_size, n_input + 1, n_output)
        self.trainable_layers = [self.output_layer]
        self.reset()

    def reset(self):
        self.output_layer.reset()

    def forward(self, X, activation_function=None):
        if isinstance(X, np.ndarray):
            X = torch.from_numpy(X.astype(np.float32)).cuda()
        # concatenate output spike to input
        bias = torch.ones(size=(X.shape[0], X.shape[1], 1), device='cuda', dtype=torch.float32)
        X = torch.cat([X, bias], dim=-1)
        out = self.output_layer.forward(X, activation_function=activation_function)
        self.out = out
        return self.out


class LinearLayerBMM:
    """Batch 3D matrix multiplication implementation of underlying single linear layer in ENU"""
    def __init__(self, n_offspring, batch_size, n_input, n_output, n_chunks=1, input_bias_index=-1, bias_value=0, orth_init=True):
        self.n_offspring = n_offspring
        self.n_input = n_input
        self.n_output = n_output
        self.n_chunks=n_chunks
        self.shape = (self.n_offspring, batch_size, self.n_input, self.n_output)
        # add random noise, creates type of "random projection", NOTE: Keeps identity initialized before intact
        #self.base_parameters = (torch.randn((n_input, n_output), device='cuda', dtype=torch.float32) / np.sqrt(n_input))
        self.base_parameters = torch.zeros((n_input, n_output), device='cuda', dtype=torch.float32)
        chunk_size = int(self.n_output/n_chunks)
        #  orthogonal initialization for better initial information flow
        if orth_init:
            for i in range(n_chunks):
                self.base_parameters[:, i*chunk_size:(i+1)*chunk_size] = init.orthogonal_(torch.empty(n_input, chunk_size, device='cuda', dtype=torch.float32))
                #self.base_parameters[:, i * chunk_size:(i + 1) * chunk_size] = init.eye_(torch.empty(n_input, chunk_size, device='cuda', dtype=torch.float32))
        # #NOTE: bias always init at zero
        # #NOTE: assumes bias is added to the input at the end
        if input_bias_index is not None and n_input > 1:
            self.base_parameters[input_bias_index, :] = bias_value
        # need momentum for each parameter vector
        self.momentum_parameters = [torch.zeros_like(self.base_parameters), torch.zeros_like(self.base_parameters)]
        # store mutated versions of our parameters as offspring
        self.pseudo_offspring = [torch.zeros((n_offspring, n_input, n_output), device='cuda', dtype=torch.float32)]
        # init all to our base parameters
        self.pseudo_offspring[0] += self.base_parameters
        # preallocate output
        self.out = torch.zeros((n_offspring, batch_size, n_output), device='cuda', dtype=torch.float32)

    def reset(self):
        self.out.fill_(0)

    def forward(self, X, activation_function=None):
        W = self.pseudo_offspring[0]
        # NOTE: W is 3D instead of 2D, containing mutated version of base parameters for each offspring
        torch.matmul(X, W, out=self.out)
        if activation_function is not None:
            self.out = activation_function(self.out)
        return self.out