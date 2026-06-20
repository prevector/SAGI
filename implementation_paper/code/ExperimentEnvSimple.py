import pickle

import numpy as np

from STDPEnv import STDPEnv
from Tools import get_data_path


class ExperimentEnvSimple:
    """Wrapper around a given RL environment for a single ENU model, turns reward into fitness and dumps relevant data"""

    def __init__(self, env, exp_name):
        self.env = env
        self.exp_name = exp_name
        self.n_output = self.env.n_actions
        self.n_input = self.env.n_obs
        self.n_agents = self.env.n_agents

    def step(self, y):
        actions = y
        obs, rewards, dones, infos = self.env.step(actions)
        X = self._convert_obs(obs)
        self.infos = infos
        fitness = rewards
        return X, rewards, fitness, infos

    def _convert_obs(self, obs):
        return obs.reshape(self.n_agents, 1, -1)

    def reset(self):
        X = self._convert_obs(self.env.reset())
        return X

    def render(self):
        self.env.render()

    def track_vis_data(self, vis_data, model, X, y_est, t):
        n_fetch = 128
        y = self.infos['y']
        # get clustered offspring too! for STDP window! actually most important..
        X = X.reshape(self.env.n_pseudo_env, -1, *X.shape[1:])
        y = y.reshape(self.env.n_pseudo_env, -1, *y.shape[1:])
        y_est = y_est.reshape(self.env.n_pseudo_env, -1, *y_est.shape[1:])
        vis_data+=[(X[:, :n_fetch, :], y_est[:, :n_fetch, :], y[:, :n_fetch, :])]

    def dump_vis_data(self, vis_data, fitness_per_offspring, e):
        with open(get_data_path(e, self.exp_name, "output"), 'wb') as f:
            pickle.dump((vis_data, fitness_per_offspring), f)

    @staticmethod
    def load_vis_data(e, exp_name):
        with open(get_data_path(e, exp_name, "output"), 'rb') as f:
            vis_data, fitness_per_offspring = pickle.load(f)
        return vis_data, fitness_per_offspring