import numpy as np
import pickle
import time

import matplotlib
#matplotlib.use('Agg') #DOCKER!

import matplotlib.pyplot as plt
import seaborn as sns

import Visualizer
from EnuGlobalNetwork import EnuGlobalNetwork
from EvolvableNeuralUnitStacked import EvolvableNeuralUnitStacked
from ExperimentEnvGlobalNetworkSurvival import ExperimentEnvGlobalNetworkSurvival
from ExperimentEnvSimple import ExperimentEnvSimple
from IAFEnv import IAFEnv
from MazeTurnEnvVec import MazeTurnEnvVec
from ModelEvaluator import ModelEvaluator
from Optimizers import GradientSearchES
from STDPEnv import STDPEnv
from Tools import get_data_path, calc_normalized_fitness_rank_based, save_fig


class Evolver:
    """ Class responsible for evolving the given ENU model, optimizer and a model evaluator """

    def __init__(self, n_offspring, base_model, optimizer, model_evaluator):

        # general params
        self.singleton_base_model = base_model
        self.optimizer = optimizer
        self.model_evaluator = model_evaluator
        self.exp_name = model_evaluator.exp_name
        self.n_offspring = n_offspring
        # -- needed to reconstruct --
        self.n_seeds = 1
        # -- store fitness of offspring
        self.fitness_offspring = np.zeros((self.n_seeds, self.n_offspring), dtype=np.float32)
        self.fitness_offspring_mean, self.fitness_offspring_std, self.fitness_offspring_max = -1000000, -1000000, -1000000
        self.fitness_offspring_mean_smooth = -1000000
        self.fitness_offspring_median = -1000000
        self.fitness_offspring_normalized = np.zeros_like(self.fitness_offspring)

    def get_base_seed(self, e):
        std = 0.01
        return e * self.n_seeds, std

    def run(self, max_generations=10000, callback=None):
        """ Main run method, starts evolution process """
        n_improvements = 0
        last_improvement = 0
        best_fitness_mean = -100000
        best_fitness_max = -100000
        momentum_modifier = 0.9
        vis_data = []
        # loop over max_generations generations
        for e in range(0, max_generations + 1):
            t1 = time.time()
            base_seed, std = self.get_base_seed(e)
            # evolve
            self.evolve(base_seed, std, momentum_modifier, e)
            # check if improving overall
            improved = self.fitness_offspring_mean > best_fitness_mean
            if improved:
                # track best mean and associated max in that population
                best_fitness_mean = self.fitness_offspring_mean
                best_fitness_max = self.fitness_offspring_max
                last_improvement = 0
                n_improvements += 1
            else:
                last_improvement += 1
                if last_improvement > 10000:
                    print("Early stop: stagnated")
                    return
            # track stats
            vis_data += [(e, time.time()-t1, self.fitness_offspring_mean, self.fitness_offspring_std, self.fitness_offspring_max)]
            if e % 1000 == 0:
                large_data = (self.fitness_offspring, self.fitness_offspring_normalized)
                self.dump_vis_data(e, vis_data, large_data)
            # callback for visualizing etc
            if callback:
                callback(e)
            if e%10==0:
                print("Generation", e, " Fitness:", self.fitness_offspring_mean, "(mean) ", self.fitness_offspring_std, "(std) ", self.fitness_offspring_max, "(max) ", self.fitness_offspring[0, 0], "(base)")
                # check iteration time
                print("time", time.time() - t1)

    def dump_vis_data(self, e, vis_data, large_data):
        """Dump raw data"""
        path = get_data_path(e, self.exp_name, "progress")
        with open(path, 'wb') as f:
            pickle.dump((vis_data, large_data), f)

    @staticmethod
    def plot_progress(e, exp_name):
        """Plotting function, plots progress in terms of fitness over generations"""
        path = get_data_path(e, exp_name, "progress")
        with open(path, 'rb') as f:
            vis_data, fitness_data = pickle.load(f)
            _, run_time, fitness_mean, fitness_std, fitness_max = map(np.array, zip(*vis_data))
        plt.figure()
        steps = np.arange(fitness_mean.shape[0])
        skip = 0
        plt.plot(fitness_mean[skip:], label="ENU Mean fitness", alpha=0.8)
        plt.fill_between(steps[skip:], fitness_mean[skip:] - fitness_std[skip:], fitness_mean[skip:] + fitness_std[skip:], alpha=0.3)
        plt.plot(fitness_max[skip:], label="ENU Max fitness", alpha=0.8)
        print(e, exp_name, "mean", fitness_mean[-1], fitness_std[-1], "max", fitness_max[-1], "generational", np.mean(fitness_mean[skip:]))
        #plt.ylim([0.95, 1.01])
        plt.legend()
        save_fig(e, exp_name, "progress")

    def evolve(self, seed, std, momentum_modifier, e):
        """Evaluates fitness and updates base parameters of model by calculating and applying approximate gradient from ES"""
        self._evaluate_fitness(seed, std, e)
        learning_rate = 1
        self.optimizer.apply_gradients(self.fitness_offspring, self.fitness_offspring_normalized, learning_rate, seed, std, momentum_modifier, e)

    def _evaluate_fitness(self, seed, std, e):
        """Generates N offspring and mutates each with random noise, then evaluates fitness of those offspring"""
        # run for multiple offspring seeds
        for s in range(self.n_seeds):
            sub_seed = seed + s
            # then create our offspring mutating the base parameters
            self.optimizer.generate_offspring_and_mutate(sub_seed, std, e)
            # then get fitness by calculating output of each offspring and evaluate how good it is
            fitness = self.model_evaluator.calculate_fitness_per_offspring(e)
            self.fitness_offspring[s, :] = fitness
        # then calculate our average fitness
        self.fitness_offspring_mean, self.fitness_offspring_std = np.mean(self.fitness_offspring), np.std(self.fitness_offspring)
        self.fitness_offspring_max = np.max(self.fitness_offspring)
        self.fitness_offspring_median = np.median(self.fitness_offspring)
        # also store normalized fitness for gradient calculations
        self.fitness_offspring_normalized[:] = calc_normalized_fitness_rank_based(self.fitness_offspring)
        return self.fitness_offspring_mean

def construct_global_network_exp(exp_name):
    """Constructs ENU Network model and related experiment environment"""
    n_offspring = 512
    n_pseudo_env = 8
    print("total offspring", n_offspring * n_pseudo_env)
    print(exp_name)
    # define env
    env = MazeTurnEnvVec(n_offspring * n_pseudo_env, n_steps=400)
    env.n_pseudo_env = n_pseudo_env
    # wrap experiment env around it
    env_to_optimize = ExperimentEnvGlobalNetworkSurvival(env, exp_name)
    # env defined parameters
    n_output_neurons = env_to_optimize.n_output
    n_input_neurons = env_to_optimize.n_input_neurons
    # network enu parameters
    n_hidden_neurons = 3
    # n_hidden_neurons = 8
    n_syn_per_neuron = 8  # 3
    # n_hidden_neurons = 2
    # n_syn_per_neuron = 2
    # construct model
    singleton_model = EnuGlobalNetwork(n_offspring * n_pseudo_env, n_pseudo_env=n_pseudo_env,
                                       n_input_neurons=n_input_neurons, n_output_neurons=n_output_neurons,
                                       n_hidden_neurons=n_hidden_neurons,
                                       n_syn_per_neuron=n_syn_per_neuron)
    singleton_model.print()
    # create model evaluator
    model_evaluator = ModelEvaluator(singleton_model, env_to_optimize, n_steps=env.n_steps)
    # create ES optimizer
    optimizer = GradientSearchES(n_offspring, singleton_model)
    # create evolver
    evolver = Evolver(n_offspring, singleton_model, optimizer, model_evaluator)
    return model_evaluator, evolver

def construct_single_exp(exp_name, batch_size=32):
    """Constructs single ENU and related experiment environments"""
    n_offspring = 512
    n_pseudo_env = batch_size
    print("total offspring", n_offspring * n_pseudo_env)

    print(exp_name)
    if "STDP" in exp_name:
        neuro_modulated = ("neuromodulated" in exp_name)
        env = STDPEnv(n_offspring * n_pseudo_env, n_pseudo_env, max_seq_length=100, neuro_modulated=neuro_modulated)
    elif "IAF" in exp_name:
        env = IAFEnv(n_offspring * n_pseudo_env, n_pseudo_env, max_seq_length=100, neuro_modulated=False)
    env_to_optimize = ExperimentEnvSimple(env, exp_name)
    # env defined parameters
    n_output = env_to_optimize.n_output
    n_input = env_to_optimize.n_input
    n_hidden = 32
    # construct model
    singleton_model = EvolvableNeuralUnitStacked(n_offspring * n_pseudo_env, 1, n_input, n_hidden, n_output, n_layers=0)
    singleton_model.n_pseudo_env = n_pseudo_env
    if "IAF" in exp_name:
        singleton_model.spike_output = True
    #set additional parameters
    singleton_model.n_input = 1
    singleton_model.n_input_channels = env_to_optimize.n_input
    singleton_model.print()
    # create evaluator optimizer and evolver objects
    model_evaluator = ModelEvaluator(singleton_model, env_to_optimize, n_steps=env.n_steps)
    optimizer = GradientSearchES(n_offspring, singleton_model)
    evolver = Evolver(n_offspring, singleton_model, optimizer, model_evaluator)
    return model_evaluator, evolver


if __name__ == '__main__':
    """Main entry to the code, construct singular ENU or network of ENUs and runs the evolution process"""

    # create experiment
    # NOTE: uncomment desired experiment to run
    #model_evaluator, evolver = construct_global_network_exp("RLMazeModelTmaze_enu_network")
    model_evaluator, evolver = construct_single_exp("SynapseModelSTDP_neuromodulated_enu_singular")
    #model_evaluator, evolver = construct_single_exp("NeuronModelIAF_enu_singular")

    # figure for live visualization
    fig = plt.figure(figsize=(8, 8))
    # define func to visualize output of model through callback
    def callback(e):
        from Plotter import create_figures
        if e % 1000 == 0:
            print("--Generating Figures--")
            create_figures(model_evaluator.exp_name, e)
        # on docker cant live visualize, locally can
        backend = matplotlib.get_backend()
        if e%10==0 and backend != "Agg":
            print("--Plotting--")
            Visualizer.plot_output(model_evaluator)
            print("-----------")

    # max generations
    if "RLMazeModel" in model_evaluator.exp_name:
        max_generations = 100000
    else:
        max_generations = 10000

    # run evolver
    evolver.run(callback=callback, max_generations=max_generations)
    # live visualization
    plt.show()