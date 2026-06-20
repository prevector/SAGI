import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style("darkgrid")
import numpy as np


def plot_output(model_evaluator):
    """Live visualization of model output"""

    model = model_evaluator.model
    # plot default function
    input_dim = model.n_input
    output_dim = model.n_output
    n_steps = model_evaluator.output_per_step.shape[1]
    if input_dim==1 and n_steps>=50:
        plt.clf()
        plt.ylim([-1.1, 1.1])
        plt.xlim([0, n_steps])
        # highest fitness
        best_offspring = np.argmax(model_evaluator.fitness_per_offspring)
        #best_offspring = 0
        t = np.arange(0, n_steps)
        output_best = model_evaluator.output_per_step[best_offspring, :, :]
        plt.plot(t, output_best, alpha=0.2)
        #print("best_offspring", best_offspring)
        for i in range(1):
            #print(np.sum(model_evaluator.input_per_step[i, :, :, 0] * model_evaluator.input_per_step[i, :, :, 1]), model_evaluator.output_per_step[i, -1, :])
            #plt.plot(t, model_evaluator.input_per_step[i, :, :, 0], alpha=0.7, color="blue")
            # plt.plot(t, model_evaluator.input_per_step[i, :, :, 1], alpha=0.9)
            # plt.plot(t, model_evaluator.input_per_step[i, :, :, 2], alpha=0.9)
            plt.plot(t, model_evaluator.input_per_step[i, :, 0, :], alpha=0.9)
            plt.plot(t, model_evaluator.output_per_step[i, :, :], alpha=0.9)
            plt.plot(t, model_evaluator._output_per_step_expected[i, :, :], alpha=0.9)
        plt.pause(0.005)
        #print("output_var", np.var(model_evaluator.output_per_step))
    elif output_dim<=4 and n_steps>=50:
        plt.clf()
        plt.ylim([-1.1, 1.1])
        plt.xlim([0, n_steps])
        # highest fitness
        best_offspring = np.argmax(model_evaluator.fitness_per_offspring)
        #best_offspring = 0
        t = np.arange(0, n_steps)
        output_best = model_evaluator.output_per_step[best_offspring, :, :]
        plt.plot(t, output_best, alpha=0.2)
        print("best_offspring", best_offspring)
        for i in range(1):
            plt.plot(t, -model_evaluator.input_per_step[i, :, :, 0], alpha=0.7, color="gray")
            plt.plot(t, -model_evaluator.input_per_step[i, :, :, 2], alpha=0.9, color="red")
            plt.plot(t, -model_evaluator.input_per_step[i, :, :, 1], alpha=0.9, color="green")
            plt.plot(t, model_evaluator.output_per_step[i, :, :], alpha=0.9)
        plt.pause(0.005)
        print("output_var", np.var(model_evaluator.output_per_step))
