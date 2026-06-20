import numpy as np
np.random.seed(0)
import torch
torch.random.manual_seed(0)


class AbstractLayerBMM:
    """Abstract interface to extend on, such that each BMM layer and module has same fields and functions"""

    def __init__(self, n_offspring, batch_size, n_input, n_output):
        # --- GPU RELATED ----
        self.gpu = True
        self.device = torch.device("cuda" if self.gpu else "cpu")
        torch.random.manual_seed(0)
        print("Device: " + ("GPU" if self.gpu else "CPU") + ", Backend: " + ("Torch" if self.gpu else "TorchCPU"))
        # --- general ---
        # can train multiple "layers" of parameters
        # there is only a Singleton model, important so that we only allocate memory once on GPU
        self.out = None
        self.n_offspring = n_offspring
        self.n_output = n_output
        self.n_input = n_input
        self.batch_size = batch_size
        self.trainable_layers = []
        self.shape = (self.n_offspring, self.batch_size, self.n_input, self.n_output)

    def get_output(self):
        return self.out

    def asnumpy_(self, x):
        return x.cpu().numpy()

    def get_output_(self):
        return self.asnumpy_(self.out)

    def get_output_gates_(self):
        pass

    def print(self):
        print("------")
        for layer in self.trainable_layers:
            print(layer.shape)
        print("------")

    @staticmethod
    def plot_network_activity(e, exp_name):
        pass


def sigmoid(X):
    return torch.sigmoid(3*X)

def sigmoid_biased(X):
    return torch.sigmoid(3*(X+1))

def tanh(X):
    return torch.tanh(3*X)

def noisy_func(X, af):
    X_af = af(X)
    return af(X_af + torch.randn(size=X_af.shape) * torch.abs(X_af - X))

def step_func(X):
    return torch._cast_Float(X>0)

def hard_sigmoid(X):
    #return torch.sigmoid(X)
    return (0.5*X + 0.5).clamp(0, 1)

def shifted_hard_sigmoid(X):
    #return torch.sigmoid(X)
    return (0.5*(X+1) + 0.5).clamp(0, 1)

def hard_tanh(X):
    #return torch.tanh(10*X)
    return (X).clamp(-1, 1)

def biased_hard_tanh(X):
    #return torch.tanh(X)
    return (X+0.1).clamp(-1, 1)

def trelu(X):
    return X.clamp(0, 1)

def relu(X):
    return X.clamp_min(0)