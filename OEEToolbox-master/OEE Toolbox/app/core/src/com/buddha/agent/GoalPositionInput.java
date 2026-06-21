package com.buddha.agent;

import com.badlogic.gdx.math.Vector2;
import com.buddha.simulation.Simulation;

public class GoalPositionInput extends InputElement {
	
	public boolean ownGoal;
	public boolean distance;
	public boolean angle;
	
	public GoalPositionInput(boolean ownGoal, boolean distance, boolean angle) {
		this.ownGoal = ownGoal;
		this.distance = distance;
		this.angle = angle;
		if(distance) size++;
		if(angle) size++;
		input = new float[size];
	}
	
	@Override
	public void update(Simulation sim, Agent agent) {
		int teamIdx = this.teamIdx(agent, sim);
		Vector2 goalPos = sim.goals.get(ownGoal ? teamIdx : 1-teamIdx).getCenter();
		float ang = Agent.calcAngle(agent, goalPos);
		float dst = Agent.calcDist(agent, goalPos, agent.cutoff);
		int idx = 0;
		if(distance) input[idx++]=dst;
		if(angle) input[idx++]=ang;
	}
}
