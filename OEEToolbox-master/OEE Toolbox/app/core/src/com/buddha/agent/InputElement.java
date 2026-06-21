package com.buddha.agent;

import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector2;
import com.buddha.simulation.Simulation;
import com.buddha.world.Particle;

public class InputElement {
	
	public int size;
	protected float[] input;
	public int startIdx;
	
	public InputElement() {
		
	}
	
	public void update(Simulation sim, Agent agent) {
		
	}
	
	public int teamIdx(Agent a, Simulation sim) {
		return sim.teams.indexOf(a.team, true);
	}
	
	public float distance(Agent agent, Vector2 vec, float cutoff) {
		return Agent.calcDist(agent, vec, cutoff);
	}
	
	public float direction(Agent agent, Particle p) {
		float dir =  MathUtils.atan2(p.getXVel(), p.getYVel());
		return Agent.angDiff(dir-agent.direction);
	}
	
	public float angle(Agent agent, Vector2 vec) {
		return Agent.calcAngle(agent, vec);
	}
}
