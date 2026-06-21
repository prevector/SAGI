package com.buddha.agent;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Array;
import com.buddha.simulation.Properties;
import com.buddha.simulation.Simulation;
import com.buddha.world.AABB;

public class Team {
	
	public static final Color[] colors = new Color[]{new Color(0x55ec5dff), new Color(0xe4ec55ff), 
			new Color(0xf49aefff), new Color(0x9f9af4ff), Color.BLACK, Color.WHITE, Color.BROWN, Color.ORANGE};
	private static DstComparer DIST_COMPARER = new DstComparer();
	private static int id_counter = 0;
	public int id = id_counter++;
	public static final Array<AABB> startPositionsLeft = makeStartPositions(-1);
	public static final Array<AABB> startPositionsRight = makeStartPositions(1);
	
	public  Array<Agent> players = new Array<Agent>();
	private Array<Agent> playersTemp = new Array<Agent>();
	public Array<Integer> geneIdxAtPosition = new Array<Integer>();
	public Array<Properties> trainingProperties = new Array<Properties>();
	
	public int size = 11;
	public int hasBall;
	public int score;
	public Color color;
	public Array<Genotype> genotypes = new Array<Genotype>();
	public int currentlyTraining = 0;
	
	public int teamNumber;

	public Team(Team team, Genotype newGene, int teamNumber) {
		this.teamNumber = teamNumber;
		for(int i = 0; i < team.genotypes.size; i++) {
			if(i == team.currentlyTraining) {
				genotypes.add(newGene);
			} else {
				genotypes.add(team.genotypes.get(i));
			}
		}
		this.geneIdxAtPosition = new Array<Integer>(team.geneIdxAtPosition);
		this.trainingProperties = team.trainingProperties;
		init();
	}
	
	public Team(Team team) {
		this.teamNumber = team.teamNumber;
		for(Genotype gene : team.genotypes) {
			genotypes.add(gene);
		}
		this.geneIdxAtPosition = new Array<Integer>(team.geneIdxAtPosition);
		this.trainingProperties = team.trainingProperties;
		init();
	}
	
	//for setup
	public Team() {
		
	}
	
	public void addPlayer(Genotype genotype, int position) {
		int idx = genotypes.indexOf(genotype, true);
		if(idx==-1) {
			geneIdxAtPosition.add(genotypes.size);
			genotypes.add(genotype);
		} else {
			geneIdxAtPosition.add(idx);
		}
	}
	
	public void init() {
		for(int i = 0; i < size; i++) {
			Agent agent = new Agent(0,0, this, genotypes.get(geneIdxAtPosition.get(i)));
			players.add(agent);
			playersTemp.add(agent);
		}
	}
	
	public Agent getClosest(Vector2 v, boolean excludeV, int idx) {
		DIST_COMPARER.compareTo = v;
		Agent closest =  playersTemp.selectRanked(DIST_COMPARER, excludeV ? idx+2 : idx+1);
		return closest;
	}
	
	/**
	 * @param side -1 (left) or 1 (right)
	 */
	public void position(int side) {
		Array<AABB> positions = side==-1 ? startPositionsLeft : startPositionsRight;
		for(int i = 0; i < players.size; i++) {
			AABB bounds = positions.get(i);
			Agent player = players.get(i);
			player.setState(MathUtils.random(bounds.x1, bounds.x2), 
					MathUtils.random(bounds.y1, bounds.y2), side==-1 ? 0 : MathUtils.PI);
			player.inactive.reset();
		}
	}
	
	public Genotype getGene() {
		return genotypes.get(currentlyTraining);
	}
	
	public void trainNext() {
		Properties prop = null;
		for(int i = 1; i <= genotypes.size; i++) {
			int idx = (i+currentlyTraining) % genotypes.size;
			prop = getTrainPropertiesFor(genotypes.get(idx).properties.getSProperty("name"));
			if(prop.getBProperty("train")) {
				currentlyTraining = idx;
				break;
			}
		}
		System.out.println("now training " + currentlyTraining + " " + prop.getSProperty("name"));
	}
	
	public Properties getTrainPropertiesFor(String name) {
		for(Properties p : trainingProperties) {
			if(p.getSProperty("name")==name) {
				return p;
			}
		}
		return null;
	}
	
	public int numActivePlayers() {
		int num = 0;
		for(Agent a: players) {
			if(a.hasHitBall) num++;
		}
		return num;
	}
	
	public void score() {
		score++;
	}

	public void knockout() {
		for(Agent a : players) {
			a.knockout();
		}
	}
	
	public static Array<AABB> makeStartPositions(int dir) {
		Array<AABB> positions = new Array<AABB>();
		AABB field = Simulation.bounds;
		float width = field.getWidth()/2f;
		float height = field.getHeight();
		float offset = 0.5f;
		positions.add(new AABB(offset, height/4f+offset, width/3f-offset, 3*height/4f-offset));
		for(int i = 0; i < 5; i++) {
			positions.add(new AABB(width/3f+offset, i*height/5f+offset, 2*width/3f-offset, (i+1)*height/5f-offset));
		}
		for(int i = 0; i < 5; i++) {
			positions.add(new AABB(width*2/3f+offset, i*height/5f+offset, width-offset, (i+1)*height/5f-offset));
		}
		if(dir==1) {
			for(AABB box : positions) {
				float x1, x2;
				x1 = field.x2-box.x2;
				x2 = field.x2-box.x1;
				box.set(x1, box.y1, x2, box.y2);
			}
		}
		return positions;
	}

	public void setProperties(Array<Properties> trainingProperties) {
		this.trainingProperties = trainingProperties;
	}
	
}
