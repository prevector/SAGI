import pickle

import numpy as np
from torch.nn.functional import pad

from Tools import get_data_path

np.random.seed(0)
import torch
torch.random.manual_seed(0)

class GradientSearchES:
    """Evolution Strategies implementation, approximates a gradient through random noise sampling (the offspring),
    and updates parameters in that approximate gradient direction"""

    def __init__(self, n_offspring, model):
        self.trainable_layers = model.trainable_layers
        self.n_offspring = n_offspring
        self.n_pseudo_env = model.n_pseudo_env

    def generate_offspring_and_mutate(self, seed, base_std, e):
        #NOTE: seed is initialized at top, so that each layer generates different numbers
        if seed is not None:
            torch.random.manual_seed(seed)
        for layer in self.trainable_layers:
            self._mutate_weights_layer(layer, base_std, e)

    def _mutate_weights_layer(self, layer, std, e):
        std_scaled = std
        # generate sub-clusters of offspring, each cluster has multiple copies of same offspring such that each offspring
        # is effectively evaluated on multiple environments (averaging the fitness across the batch, reducing variance)
        n_clusters = self.n_offspring
        n_clusters_half = int(n_clusters/2)
        # generate offspring through random gaussian mutation
        random_gradients_cluster = torch.randn(size=(n_clusters_half, layer.n_input, layer.n_output), device='cuda', dtype=torch.float32) * std_scaled
        # base parameters stored at 0 and evaluated, good to know fitness of center
        random_gradients_cluster[0].fill_(0)
        # mirror gradients
        random_gradients_cluster = torch.cat([random_gradients_cluster, -random_gradients_cluster], dim=0)
        # repeat initial gradients, and sample around those cluters
        random_gradients_cluster = random_gradients_cluster.repeat(self.n_pseudo_env, 1, 1)
        # use clustered gradients
        random_gradients = random_gradients_cluster
        # create the offspring by adding to base parameters
        torch.add(layer.base_parameters, random_gradients, out=layer.pseudo_offspring[0])

    def apply_gradients(self, fitness_raw_cpu, fitness_normalized_cpu, learning_rate, seed, std, momentum_modifier, e):
        momentum_modifier = 0.9
        # copy cpu to gpu
        parent_fitness_ranked = torch.from_numpy(fitness_normalized_cpu).cuda()
        fitness_raw = torch.from_numpy(fitness_raw_cpu).cuda()
        # calc gradient for all layers
        for layer in self.trainable_layers:
            # NOTE: EXCLUDE DUPLICATE CLUSTERED GRADIENTS!
            # get back the raw gradients
            raw_gradients = (layer.pseudo_offspring[0][:self.n_offspring] - layer.base_parameters)
            # calculate approximate gradient through fitness weighting
            gradient = torch.sum(raw_gradients * parent_fitness_ranked.reshape(-1, 1, 1), dim=0)
            # update momentum
            torch.add(layer.momentum_parameters[0] * momentum_modifier, gradient * learning_rate, out=layer.momentum_parameters[0])
            # apply momentum to parameters
            torch.add(layer.base_parameters, layer.momentum_parameters[0], out=layer.base_parameters)