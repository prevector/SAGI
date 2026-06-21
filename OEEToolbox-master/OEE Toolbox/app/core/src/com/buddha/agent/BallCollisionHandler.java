package com.buddha.agent;

import com.badlogic.gdx.math.MathUtils;

public class BallCollisionHandler {
	
	int outputIdx;
	
	public BallCollisionHandler(int outputIdx) {
		this.outputIdx = outputIdx;
	}
	
	public void handleCollision(Agent agent, Ball ball) {
		//check if in fov
		
		float angDiff = Agent.calcAngle(agent, ball.circle.particle.pos);
		if(Math.abs(angDiff) < MathUtils.PI/2f && agent.output.vec[outputIdx+1]>0.25f) {
			float angle = getAngle(agent);
			
			float magnitude = getMagnitude(agent);
			float r = agent.circle.radius+ball.circle.radius+0.1f;
			float cos = MathUtils.cos(angle);
			float sin = MathUtils.sin(angle);
			float kickX = agent.circle.getX()+MathUtils.cos(agent.direction)*r;
			float kickY = agent.circle.getY()+MathUtils.sin(agent.direction)*r;
			ball.circle.particle.pos.set(kickX, kickY);
			if(ball.z < 1 && Math.abs(ball.dz) <= 0.2f) {
				ball.dz+=0.4f+magnitude*0.4f;
			}
			ball.circle.particle.setVel(cos*magnitude+agent.circle.particle.getXVel(), 
					sin*magnitude+agent.circle.particle.getYVel());
			agent.kick(kickX, kickY, angle, magnitude);
		}
	}

	public float getAngle(Agent agent) {
		return agent.direction+(agent.output.vec[outputIdx])*MathUtils.PI/2f;
	}
	
	public float getMagnitude(Agent agent) {
		return (agent.output.vec[outputIdx+1]+1)*0.45f;
	}
}
