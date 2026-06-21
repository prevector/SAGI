package com.buddha.simulation;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.utils.Array;
import com.buddha.agent.Genotype;
import com.buddha.agent.Team;
import com.buddha.train.EvolutionStrategy;

public class FootballEvolution {
	
	public int popSize;
	public EvolutionStrategy strategy;
	public int selectionSize;
	public int generation;
	public Array<Team> population;
	public Array<Selection> selections = new Array<Selection>();
	public int selectionIdx;
	public int numTournaments;
	public float learningRate;
	public Team team;
	
	public FootballEvolution(int selectionSize, int tournaments, Team team) {
		this.numTournaments = tournaments;
		this.popSize = selectionSize*tournaments;
		this.selectionSize = selectionSize;
		this.team = team;
		learningRate = Properties.current.getFProperty("learning rate");
		float sigma = Properties.current.getFProperty("standard deviation");
		strategy = new EvolutionStrategy(sigma, learningRate, team.getGene().weights, popSize);
		strategy.updateEpsilons(MathUtils.random);
		strategy.updateGenes();
		nextGeneration();
	}
	
	public void makeTournaments() {
		selectionIdx = 0;
		selections.clear();
		//form pairs for simulationscreen to evaluate
		Array<Tournament> tournaments = new Array<Tournament>(popSize/2);
		for(int i = 0; i < popSize/2; i++) {
			tournaments.add(new Tournament(population.get(i*2), population.get(i*2+1)));
		}
		for(int i = 0; i < popSize/selectionSize; i++) {
			Selection s = new Selection();
			for(int j = 0; j < selectionSize/2; j++) {
				s.tournaments.add(tournaments.pop());
			}
			selections.add(s);
		}
	}
	
	public void nextGeneration() {
		float learningRate = Properties.current.getFProperty("learning rate");
		strategy.alpha = learningRate;
		Array<Integer> winners = new Array<Integer>();
		Array<Team> nextPop = new Array<Team>();
		if(population!=null) {
			for(Selection sel : selections) {
				winners.add(sel.getWinner().teamNumber);
			}
			for(int i = 0; i < strategy.populationSize; i++) {
				strategy.setFitness(i, winners.contains(i, true) ? 100000.0f : 0f);
			}
			strategy.generation(MathUtils.random);
		}
		for(int i = 0; i < popSize; i++) {
			Genotype genotype = new Genotype(team.getGene(), strategy.genes[i]);
			Team newTeam = new Team(team, genotype, i);
			nextPop.add(newTeam);
		}
		team.getGene().weights.set(strategy.solution);
		this.population = nextPop;
		makeTournaments();
		generation++;
	}

	public Tournament next() {
		Tournament next = selections.get(selectionIdx).next();
		if(next == null) {
			if(selectionIdx==selections.size-1) {
				return null;
			}
			next = selections.get(++selectionIdx).next();
		}
		return next;
	}
	
	public class Selection {
		public Array<Tournament> tournaments = new Array<Tournament>();
		public int atIdx;
		
		public Selection() {
			atIdx = 0;
		}
		
		public Team getWinner() {
			return tournaments.get(0).getWinner();
		}
		
		public Tournament next() {
			if(atIdx>=tournaments.size) {
				if(tournaments.size==1) {
					return null;
				} 
				Array<Tournament> nTournaments = new Array<Tournament>(tournaments.size/2);
				for(int i = 0; i < tournaments.size/2; i++) {
					Team w1 = new Team(tournaments.get(i*2).getWinner());
					Team w2 = new Team(tournaments.get(i*2+1).getWinner());
					nTournaments.add(new Tournament(w1, w2));
				}
				atIdx = 0;
				tournaments = nTournaments;
			}
			return tournaments.get(atIdx++);
		}
	}
	
	public class Tournament {
		public Team a;
		public Team b;
		
		public Tournament(Team a, Team b) {
			this.a = a;
			this.b = b;
		}
		
		public Team getWinner() {
			if(a.score==b.score) {
				int numActiveA = a.numActivePlayers();
				int numActiveB = b.numActivePlayers();
				if(numActiveA==numActiveB) {
					if(a.hasBall > b.hasBall) {
						return a;
					} else {
						return b;
					}
				} else if(a.numActivePlayers() > b.numActivePlayers()) {
					return a;
				} else {
					return b;
				}
			} else {
				if(a.score > b.score) {
					return a;
				} else {
					return b;
				}
			}
		}
	}
}
