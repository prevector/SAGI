import pickle

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from Tools import get_data_path, save_fig

np.random.seed(0)


class STDPEnv:
    """Implementation of vectorized Spike-Timining-Dependent synaptic Plasticity (STDP) RL environment. """

    def __init__(self, n_agents, n_pseudo_env, max_seq_length=100, neuro_modulated=False):
        self.n_actions = 1
        self.n_obs = 4
        self.n_agents = n_agents
        # other vars
        self.full_action_input = True
        self.n_steps = max_seq_length
        # neuromodulated option, which only updates synaptic weight if neuromodulation signal is present
        self._neuro_modulated=neuro_modulated
        if self._neuro_modulated:
            print("Neuromodulated")
        self.n_pseudo_env = n_pseudo_env

    def step(self, output):
        # single output
        output = output.reshape(self.n_agents)
        self._network_output = output
        # STDP task, 4 inputs, random graded potential , input spike, BP spike, A-NT1
        # if BP spike > input spike -> LTP, if BP spike < input spike -> LTD
        # if A-NT=1 -> STDP else -> No change!
        # if spike, depending on time difference, graded potential goes down!
        t = self.t

        # reward
        w = self._internal_state
        y = self.obs[:, 0] * w
        self.rewards = -np.abs(y-output)**2
        infos = {}
        infos['y'] = y.reshape(-1, 1)

        # --- STDP Model update ---
        max_t = np.maximum(self._random_spike_pre, self._random_spike_post) + 1
        timing_diff = self._random_spike_post[t == max_t] - self._random_spike_pre[t == max_t]
        synaptic_change = 0.5 * np.sign(timing_diff) * np.clip((np.exp((np.sign(timing_diff) * -timing_diff) / 10)), -1, 1)
        #synaptic_change = 0.5* np.sign(synaptic_change)
        if self._neuro_modulated:
            synaptic_change *= self._dopamine_signal[t == max_t]
        self._internal_state[t == max_t] += synaptic_change

        # --- NEW OBS ---
        spike_pre = self._random_spike_pre == t
        spike_post = self._random_spike_post == t

        X_new = self._graded_input[t]
        self.obs = np.column_stack([X_new, spike_pre, spike_post, self._dopamine_signal])
        self.t+=1
        # ignore dones, its at end of sequence
        dones = np.zeros(self.n_agents)
        return self.obs, self.rewards, dones, infos

    def reset(self):
        self.t = 0
        self.obs = np.zeros((self.n_agents, self.n_obs))

        # --- random elements NOTE: reducing variance through repeats ---
        repeats = int(self.n_agents/self.n_pseudo_env)
        n_steps = self.n_steps
        self._random_spike_pre = np.random.normal(n_steps / 2, 7, size=(self.n_pseudo_env)).clip(0, n_steps - 1).astype(np.int32).repeat(repeats)
        self._random_spike_post = np.random.normal(n_steps / 2, 7, size=(self.n_pseudo_env)).clip(0, n_steps - 1).astype(np.int32).repeat(repeats)
        # don't allow pre and post at same time
        self._random_spike_post[self._random_spike_post == self._random_spike_pre] += 1

        # random graded potential
        self._graded_input = np.random.uniform(0.45, 0.55, size=(self.n_steps, self.n_pseudo_env)).repeat(repeats, axis=1)
        self._dopamine_signal = np.zeros(self.n_agents)
        if self._neuro_modulated:
            self._dopamine_signal = np.random.randint(0, 2, self.n_pseudo_env).repeat(repeats)
            #self.obs[:, 3] = self._dopamine_signal
        # -------

        # -------
        # internal state
        self._internal_state = np.ones((self.n_agents))
        self.obs[:, 0] = self._graded_input[0]
        return self.obs

    def render(self):
        print(self.obs[0], self._internal_state[0], self._network_output[0])


    @staticmethod
    def load_vis_data(e, exp_name):
        with open(get_data_path(e, exp_name, "output"), 'rb') as f:
            vis_data, fitness_per_offspring = pickle.load(f)
        return vis_data, fitness_per_offspring

    @staticmethod
    def get_stdp_fitness(X_base, y_base, y_est_base):
        # pre before post
        pre_spike_t = np.argmax(X_base[:, :, 1] > 0, axis=0)
        post_spike_t = np.argmax(X_base[:, :, 2] > 0, axis=0)
        spike_timing = post_spike_t - pre_spike_t
        # estimate synpatic change? from raw output? when both pre and post, we know synapse changed
        syn_change_t = np.maximum(pre_spike_t, post_spike_t)

        def extract_stdp_function(y_array):
            W_rel = []
            for obs in range(X_base.shape[1]):
                pre_activity = np.mean(y_array[:syn_change_t[obs], obs, 0])
                post_activity = np.mean(y_array[syn_change_t[obs]:, obs, 0])
                if post_activity != 0:
                    rel_change = post_activity / pre_activity
                    rel_change = (rel_change - 1) * 100
                    W_rel += [rel_change]
                else:
                    W_rel += [1000]
            return W_rel
        W_rel_y = extract_stdp_function(y_base)
        w_rel_y_est = extract_stdp_function(y_est_base)
        return spike_timing, W_rel_y, w_rel_y_est

    @staticmethod
    def plot_vis_data(e, exp_name):
        neuro_modulated = "neuromodulated" in exp_name
        import matplotlib.pyplot as plt
        import seaborn as sns
        from cycler import cycler
        sns.set_style("darkgrid")

        vis_data, fitness_per_offspring = STDPEnv.load_vis_data(e, exp_name)

        offspring_idx = 0
        #x, y_est, y = np.array(vis_data).transpose(1, 2, 0, 3)
        X, Y_est, Y = map(np.array, zip(*vis_data))
        X_base, y_est_base, y_base = X[:, :, offspring_idx, 0], Y_est[:, :, offspring_idx], Y[:, :, offspring_idx]
        # --- normal output single example---
        # plt.figure()
        # plt.plot(X_base[:, 0, 1])
        # plt.plot(X_base[:, 0, 2])
        # plt.plot(X_base[:, 0, 3])
        # plt.plot(y_est_base[:, 0])
        # plt.plot(y_base[:, 0])

        plt.rc('axes', prop_cycle=(cycler('color', ['#17becf', '#9467bd', '#e377c2', '#8c564b'])))
        plt.figure(figsize=(6.4, 4))
        # --- STDP window, calculated over n_pseudo offspring ---
        if not neuro_modulated:
            spike_timing, W_rel_y, w_rel_y_est = STDPEnv.get_stdp_fitness(X_base, y_base, y_est_base)
            plt.scatter(spike_timing[:], W_rel_y[:], label="STDP Model", alpha=0.9)
            plt.scatter(spike_timing[:], np.clip(w_rel_y_est[:], -100, 100), label="Evolved ENU", alpha=0.9)
            plt.xlabel("Spike Timing")
            plt.ylabel("Synaptic Change (%)")
        else:
            not_nt = X_base[1, :, 3] == 1
            spike_timing, W_rel_y, w_rel_y_est = STDPEnv.get_stdp_fitness(X_base[:, not_nt], y_base[:, not_nt], y_est_base[:, not_nt])
            plt.scatter(spike_timing[:], W_rel_y[:], label="STDP Model (NT)", alpha=0.9)
            plt.scatter(spike_timing[:], np.clip(w_rel_y_est[:], -100, 100), label="Evolved ENU (NT)", alpha=0.9)
            nt = X_base[1, :, 3] == 0
            spike_timing_nt, W_rel_y_nt, w_rel_y_est_nt = STDPEnv.get_stdp_fitness(X_base[:, nt], y_base[:, nt], y_est_base[:, nt])
            plt.scatter(spike_timing_nt[:], W_rel_y_nt[:], label="STDP Model", alpha=0.7)
            plt.scatter(spike_timing_nt[:]+0.1, np.clip(w_rel_y_est_nt[:], -100, 100)+1, label="Evolved ENU ", alpha=0.7)
            plt.xlabel("Spike Timing")
            plt.ylabel("Synaptic Change (%)")
        # plt.ylim([-100, 100])
        plt.legend(loc='upper left')
        save_fig(e, exp_name, "STDP_window")

        plt.figure(figsize=(6.4, 4))
        i = 2
        plt.plot(y_base[:, i], label="STDP Model", alpha=0.9)
        plt.plot(y_est_base[:, i], label="Evolved ENU", alpha=0.9)
        plt.plot(X_base[:, i, 2] > 0, label="Post-synaptic Spike", alpha=0.8)
        plt.plot(X_base[:, i, 1] > 0, label="Pre-synaptic Spike", alpha=0.8)
        if neuro_modulated:
            plt.plot(X_base[:, i, 3] > 0, label="NT signal", alpha=0.4, color="gray")
        # second one
        # i = 0
        # plt.plot(y_base[:, i], label="STDP Model (NT absent)", alpha=0.2)
        # plt.plot(y_est_base[:, i], label="Evolved ENU (NT absent)", alpha=0.2)
        # plt.plot(X_base[:, i, 2] > 0, label="Post-synaptic Spike (NT absent)", alpha=0.2)
        # plt.plot(X_base[:, i, 1] > 0, label="Pre-synaptic Spike (NT absent)", alpha=0.2)
        # if neuro_modulated:
        #     plt.plot(X_base[:, i, 3] > 0, label="Neuromodulation (NT absent)", alpha=0.3)

        plt.legend()
        plt.xlabel('t')
        plt.ylabel('Output')
        save_fig(e, exp_name, "example_output")

        # plt.figure()
        # for i in range(y_base.shape[1]):
        #     plt.plot(y_base[:, i], label="STDP Model", color="blue")
        #     plt.plot(y_est_base[:, i], label="Evolved ENU", color="orange")
        #     # plt.plot(X_base[:,i, 2 ] > 0, label="Post-synapthic Spike")
        #     # plt.plot(X_base[:,i, 1] > 0, label="Pre-synaptic Spike")
        # #plt.legend()
        # plt.show()
