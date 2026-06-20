import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from EnuGlobalNetwork import EnuGlobalNetwork
from Evolver import Evolver
from IAFEnv import IAFEnv
from MazeTurnEnvVec import MazeTurnEnvVec
from STDPEnv import STDPEnv

sns.set_style("darkgrid")


def create_figures(exp_name, e=None):
    """Generates figures depending on experiment by reloading raw pkl data"""

    if "RLMaze" in exp_name:
        e = 32000 if e is None else e
        MazeTurnEnvVec.plot_vis_data(e, exp_name)
        #MazeTurnEnvVec.plot_rollout_data(e, exp_name)
        Evolver.plot_progress(e, exp_name)
    elif "IAF" in exp_name:
        e = 3000 if e is None else e
        # Evolver.plot_progress(e, exp_name)
        IAFEnv.plot_vis_data(e, exp_name)
    elif "STDP" and "neuromodulated" in exp_name:
        e = 10000 if e is None else e
        #Evolver.plot_progress(e, exp_name)
        STDPEnv.plot_vis_data(e, exp_name)

if __name__ == '__main__':
    #exp_name = "NeuronModelIAF_enu_singular"
    exp_name = "SynapseModelSTDP_neuromodulated_enu_singular"
    create_figures(exp_name, 10000)
    #create_figures(exp_name)
    plt.show()