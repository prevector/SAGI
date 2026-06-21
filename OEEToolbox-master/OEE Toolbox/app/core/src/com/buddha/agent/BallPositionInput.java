package com.buddha.agent;

import com.badlogic.gdx.math.Vector2;
import com.buddha.simulation.Simulation;

public class BallPositionInput extends InputElement {
	
	public boolean distance;
	public boolean angle;
	public boolean direction;
	
	public BallPositionInput(boolean distance, boolean angle, boolean direction) {
		this.distance = distance;
		this.angle = angle;
		if(distance) size++;
		if(angle) size++;
		if(direction) size++;
		input = new float[size];
	}
	
	@Override
	public void update(Simulation sim, Agent agent) {
		Ball ball = sim.balls.get(0);
		Vector2 ballPos = ball.circle.particle.pos;
		float ang = angle(agent, ballPos);
		float dst = distance(agent, ballPos, agent.cutoff);
		float dir = direction(agent, ball.circle.particle);
		int idx = 0;
		if(distance) {
			input[idx++] = dst;
		}
		if(angle) {
			input[idx++] = ang;
		}
		if(direction) {
			input[idx++] = dir;
		}
	}
}
