package com.buddha.agent;

import com.buddha.simulation.Simulation;

public class PlayerInput extends InputElement {
	public boolean angle;
	public boolean distance;
	public boolean ownTeam;
	public boolean fixed;
	public int targetIndex;
	
	public PlayerInput(boolean  distance, boolean angle, boolean fixed, int targetIndex, boolean ownTeam) {
		this.angle = angle;
		this.distance = distance;
		this.targetIndex = targetIndex;
		this.ownTeam = ownTeam;
		this.fixed = fixed;
		if(distance) size++;
		if(angle) size++;
		input = new float[size];
	}
	
	@Override
	public void update(Simulation sim, Agent agent) {
		super.update(sim, agent);
		Agent target = null;
		int team = this.teamIdx(agent, sim);
		Team inTeam;
		if(ownTeam) {
			inTeam = sim.teams.get(team);
		} else {
			inTeam = sim.teams.get(1-team);
		}
		if(fixed) {
			int indexInTeam = sim.teams.get(team).players.indexOf(agent, true);
			target = inTeam.players.get((indexInTeam+targetIndex+1)%inTeam.size);
		} else {
			target = inTeam.getClosest(agent.circle.particle.pos, ownTeam, targetIndex);
		}
		float dis = distance(agent, target.circle.particle.pos, agent.cutoff);
		float ang = angle(agent, target.circle.particle.pos);
		int idx = 0;
		if(distance) input[idx++] = dis;
		if(angle) input[idx++] = ang;
	}
}
