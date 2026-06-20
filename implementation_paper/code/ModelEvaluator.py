import numpy as np

from Tools import save_fig


class ModelEvaluator:

    def __init__(self, model, env, n_steps):
        """Implements fitness evaluation of the model"""
        self.model = model
        self.data_env = env
        self.exp_name = env.exp_name
        self.n_pseudo_env = model.n_pseudo_env #batch size of environemnt over which fitness is shared
        self.n_steps = n_steps
        self.fitness_per_offspring = np.zeros((self.model.n_offspring,), dtype=np.float32)
        self.input_per_step = np.zeros((self.model.n_offspring, self.n_steps, self.model.n_input, self.model.n_input_channels), dtype=np.float32)
        self.output_per_step = np.zeros((self.model.n_offspring, self.n_steps, self.model.n_output), dtype=np.float32)
        self._output_per_step_expected = np.zeros((self.model.n_offspring, self.n_steps, self.model.n_output), dtype=np.float32)

    def calculate_fitness_per_offspring(self, e):
        # calculate fitness of offspring by evaluating them on function
        self.fitness_per_offspring.fill(0)
        # JUST FOR DEBUGGING!
        self.input_per_step.fill(0)
        self.output_per_step.fill(0)
        # RESET
        self.model.reset()
        X = self.data_env.reset()
        # DATA TRACKING
        track_data = e % 1000 == 0
        self.model.track_data = track_data
        # simulate environment for n time steps
        vis_data = []
        for t in range(self.n_steps):
            # process obs in model
            self.input_per_step[:, t, :, :X.shape[2]] = np.copy(X)
            # Model forward pass
            self.model.forward(X)
            # get output from model
            y_est = self.model.get_output_()
            # get fitness as result of model action taken, and return next environment observation
            X_next, _, fitness, infos = self.data_env.step(y_est)
            self.fitness_per_offspring += fitness
            self.output_per_step[:, t] = y_est
            if infos is not None and 'y' in infos:
                self._output_per_step_expected[:, t] = infos['y']
            if e%500==0 and e > 0 and not track_data:
                self.data_env.render()
            # track more info
            if track_data:
                self.data_env.track_vis_data(vis_data, self.model, X, y_est, t)
                if e>=0:
                    self.data_env.render()
                    if e>0 and t < 400 and t%4==0 and "RLMazeModel" in self.exp_name:
                        save_fig(e, self.exp_name, "rollout/rollout_" + str(t), fig_close=False)
            X = np.copy(X_next)
        self.fitness_per_offspring/=self.n_steps
        # tracking code
        if track_data:
            self.model.dump_model(e, self.exp_name)
            self.data_env.dump_vis_data(vis_data, self.fitness_per_offspring, e)
            self.model.dump_network_activity(e, self.exp_name)
        # clustered batch fitness, sharing fitness of offspring with some mutated parameters
        fitness_per_cluster = self.fitness_per_offspring.reshape(self.n_pseudo_env, -1)
        fitness_per_cluster = np.mean(fitness_per_cluster, axis=0)
        return fitness_per_cluster
