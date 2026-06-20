import pickle

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from Tools import get_data_path, save_fig

np.random.seed(0)


class IAFEnv:
    """Implementation of vectorized Integrate and Fire Neuron (IAF) RL environment"""

    def __init__(self, n_agents, n_pseudo_env, max_seq_length=100, neuro_modulated=False):
        self.n_actions = 1
        self.n_obs = 1
        self.n_agents = n_agents
        # other vars
        self.full_action_input = True
        self.n_steps = max_seq_length
        self._neuro_modulated=neuro_modulated
        self.n_pseudo_env = n_pseudo_env

    def step(self, output):
        # single output
        y_est = output.reshape(self.n_agents)
        self._network_output = y_est

        # model update
        self._internal_state += self.obs[:, 0]
        th = 0.5
        # check if spike
        y = self._internal_state > th
        infos = {'y': y.reshape(-1, 1)}
        self.rewards = -self._get_loss(y, y_est)
        # reset internal state if we spiked
        self._internal_state = np.where(y, 0, self._internal_state)

        # randomly generate some input and update internal state to get associated output
        # X = np.ones_like(self.internal_state) * 0.05
        self.obs = self._graded_input[self.t].reshape(-1, 1)
        self.t +=1
        return self.obs, self.rewards, None, infos

    def reset(self):
        self.t = 0
        repeats = int(self.n_agents/self.n_pseudo_env)
        self._graded_input = np.random.uniform(0.01, 0.02, size=(self.n_steps, self.n_pseudo_env)).repeat(repeats, axis=1)
        #self._graded_input = np.abs(np.random.normal(0, 0.01, size=(self.n_steps, self.n_pseudo_env)).clip(0, 0.03).repeat(repeats, axis=1))
        # SAME STD ACROSS WINDOW! MORE VARIETY SPIKING RATE
        std = np.random.randint(1, 10, size=(4, self.n_pseudo_env)).repeat(int(self.n_steps/4), axis=0).repeat(repeats, axis=1)
        self._graded_input *= std
        self.obs = np.zeros((self.n_agents, 1))
        #self.obs[:, 0] = np.copy(self._graded_input[0])

        self._internal_state = np.zeros((self.n_agents))
        self.time_last_spike = np.zeros((self.n_agents), dtype=np.int32)
        self.time_last_spike_est = np.zeros((self.n_agents), dtype=np.int32)
        self.spike_count = np.zeros_like(self.time_last_spike)
        self.spike_count_est = np.zeros_like(self.spike_count)
        return self.obs

    def _get_loss(self, y, y_est):
        self.time_last_spike = np.where(y > 0.05, 0, self.time_last_spike + 1)
        self.spike_count[y>0.05] += 1
        self.time_last_spike_est = np.where(y_est > 0.05, 0, self.time_last_spike_est + 1)
        self.spike_count_est[y_est>0.05] += 1
        # spike timing loss
        spike_loss = np.abs(self.time_last_spike - self.time_last_spike_est)**2
        # optimize each spike match model spike value
        exact_spike_height = np.where(y_est>0.05, (y_est - np.ones_like(y_est)) ** 2, 0)
        # optimize both
        total_loss = spike_loss + exact_spike_height
        return total_loss

    def render(self):
        print(self.obs[0], self._internal_state[0], self._network_output[0])

    @staticmethod
    def load_vis_data(e, exp_name):
        with open(get_data_path(e, exp_name, "output"), 'rb') as f:
            vis_data, fitness_per_offspring = pickle.load(f)
        return vis_data, fitness_per_offspring

    @staticmethod
    def plot_vis_data(e, exp_name):
        import matplotlib.pyplot as plt
        from cycler import cycler
        import seaborn as sns
        sns.set_style("darkgrid")

        vis_data, fitness_per_offspring = IAFEnv.load_vis_data(e, exp_name)

        offspring_idx = 0
        #x, y_est, y = np.array(vis_data).transpose(1, 2, 0, 3)
        X, Y_est, Y = map(np.array, zip(*vis_data))
        X_base, y_est_base, y_base = X[:, :, offspring_idx, 0], Y_est[:, :, offspring_idx], Y[:, :, offspring_idx]


        # --- normal output single example---
        idx = 7
        X_base_batch0 = X_base[:, idx]
        #y_batch0 = y_base[:, 0]
        y_hidden = np.zeros_like(X_base_batch0)
        cum_sum = 0
        for i in range(0, X_base_batch0.shape[0]):
            cum_sum += X_base_batch0[i]
            if cum_sum>0.5:
                cum_sum = 0
            y_hidden[i] = cum_sum

        plt.rc('axes', prop_cycle=(cycler('color', ['#17becf', '#9467bd', '#e377c2', '#8c564b'])))
        plt.figure(figsize=(6.4, 4))
        plt.plot(y_base[:, idx], label="IAF Model", alpha=0.8)
        #plt.plot(np.maximum(y_base[:, 0], y_hidden))
        plt.plot(y_est_base[:, idx] * 0.95, label="Evolved ENU", alpha=0.8)
        plt.plot(y_hidden*0.3, label="IAF (internal)", alpha=0.5, color='skyblue')
        plt.plot(X_base[:, idx], label="Graded input", alpha=0.3)
        plt.legend(loc='upper left')
        plt.xlabel('t')
        plt.ylabel('Output')
        #plt.ylim([0, 1.5])
        save_fig(e, exp_name, "Spike_single")
        #plt.plot(y_hidden)
        # spiking plot
        plt.figure(figsize=(6.4, 4))
        n_neurons = 8
        spike_points = np.where(y_base[:, :n_neurons, 0]> 0.05)
        plt.scatter(spike_points[0], spike_points[1]-0.1, marker='|', s=100, label="IAF Model", alpha=0.8, linewidth=2)
        spike_points_est = np.where(y_est_base[:, :n_neurons, 0] > 0.05)
        plt.scatter(spike_points_est[0], spike_points_est[1]+0.1, marker='|', s=100, label="Evolved ENU", alpha=0.8, linewidth=2)
        plt.legend(loc='upper left')
        plt.xlabel('t')
        plt.ylabel('Neuron')
        #plt.ylim([-0.5, 9])
        save_fig(e, exp_name, "Spike_scatter")

