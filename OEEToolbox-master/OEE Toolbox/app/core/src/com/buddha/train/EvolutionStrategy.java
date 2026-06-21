package com.buddha.train;

import java.util.Random;
import java.util.function.Function;

import com.buddha.math.BVector;

public class EvolutionStrategy {

	public float sigma;
	public float alpha;
	public int populationSize;
	public int solutionSize;
	public BVector solution;
	public BVector[] epsilons;
	public BVector[] genes;
	public BVector fit;

	public EvolutionStrategy(float sigma, float alpha, BVector solution, int populationSize) {
		this.sigma = sigma;
		this.alpha = alpha;
		this.solutionSize = solution.size;
		this.populationSize = populationSize;
		this.solution = solution;

		epsilons = new BVector[populationSize];
		genes = new BVector[populationSize];
		fit = new BVector(populationSize);
		for (int i = 0; i < populationSize; i++) {
			epsilons[i] = new BVector(solutionSize);
			genes[i] = new BVector(solutionSize);
		}
	}

	public void updateSolution() {
		float avg = fit.average();
		float var = fit.variance();
		fit.add(-avg);
		fit.scale((float) (1.0 / Math.sqrt(var)));
		// update solution
		BVector wavg = new BVector(solutionSize);
		for (int i = 0; i < populationSize; i++) {
			wavg.add(epsilons[i].scale(fit.vec[i]));
		}
		wavg.scale(alpha / (populationSize * sigma));
		solution.add(wavg);
	}

	public void simpleUpdateSolution() {

	}

	public void updateEpsilons(Random rand) {
		for (int i = 0; i < populationSize; i++) {
			BVector eps = epsilons[i];
			for (int j = 0; j < solutionSize; j++) {
				eps.vec[j] = (float) rand.nextGaussian();
			}
			epsilons[i] = eps;
		}
	}

	public void updateGenes() {
		for (int i = 0; i < populationSize; i++) {
			genes[i].set(solution);
			genes[i].add(BVector.scale(epsilons[i], sigma));
		}
	}

	public void setFitness(int idx, float value) {
		fit.vec[idx] = value;
	}

	public void generation(Function<float[], Float> fitness, Random rand) {
		// generate epsilons
		updateEpsilons(rand);
		updateGenes();
		// calculate fitness
		for (int i = 0; i < populationSize; i++) {
			fit.vec[i] = fitness.apply(genes[i].vec);
		}
		updateSolution();
	}

	/**
	 * assumes fitness has been set manually
	 */
	public void generation(Random rand) {
		updateSolution();
		updateEpsilons(rand);
		updateGenes();
	}

}