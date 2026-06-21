package com.buddha.render;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.graphics.g2d.TextureAtlas.AtlasRegion;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector3;
import com.buddha.agent.Agent;
import com.buddha.phys3d.Constraint3;
import com.buddha.phys3d.Particle3;
import com.buddha.phys3d.Skeleton;

public class AgentRenderer {
	
	private SpriteBatch batch;
	private RenderUtils utils;
	
	private AtlasRegion circle;
	
	private float depth;
	//colors

	public AgentRenderer(SpriteBatch batch, TextureAtlas atlas, RenderUtils utils) {
		this.batch = batch;
		this.utils = utils;
		circle = atlas.findRegion("circle");
	}
	
	public void drawAgent(Agent agent, Camera cam) {
		Skeleton skeleton = agent.getSkeleton();
		float width = agent.skeleton.width;
		Color teamColor = agent.getColor();
		this.depth = cam.depth;
		Color skinColor = agent.skinColor;
		Color shoeColor = agent.shoeColor;
		//lower legs
		batch.setColor(skinColor);
		drawLimb(skeleton.getC(10), width);
		drawLimb(skeleton.getC(8), width);
		batch.setColor(shoeColor);
		drawParticle(skeleton.get(9), width*1.5f);
		drawParticle(skeleton.get(11), width*1.5f);
		batch.setColor(skinColor);
		drawParticle(skeleton.get(8), width);
		drawParticle(skeleton.get(10), width);
		
		//pants
		batch.setColor(teamColor);
		drawShirt(skeleton.getC(7), width*2f, width);
		drawShirt(skeleton.getC(9), width*2f, width);
		drawParticle(skeleton.get(7), width*2f);
		drawParticle(skeleton.get(6), width*1.5f);
		drawShirt(skeleton.getC(6), width*1.5f, width*2f);
		drawShirt(skeleton.getC(5), width, width*1.5f);
		//neck
		drawParticle(skeleton.get(1), width);
		//arms
		batch.setColor(skinColor);
		drawParticle(skeleton.get(2), width);
		drawParticle(skeleton.get(4), width);
		batch.setColor(teamColor);
		drawShirt(skeleton.getC(1), width, width*1.5f);
		drawShirt(skeleton.getC(3), width, width*1.5f);
		batch.setColor(skinColor);
		drawLimb(skeleton.getC(2), width);
		drawLimb(skeleton.getC(4), width);
		drawParticle(skeleton.get(3), width*1.5f);
		drawParticle(skeleton.get(5), width*1.5f);
		drawLimb(skeleton.getC(0), width);
		 
		float eyeAngle = 0.7f;
		if(agent.direction+eyeAngle >= 0) {
			drawEye(agent, skeleton, width, eyeAngle);
		}
		if(agent.direction-eyeAngle < -MathUtils.PI || 
				agent.direction-eyeAngle >= 0) {
			drawEye(agent, skeleton, width, -eyeAngle);
		}
		//draw head
		batch.setColor(skinColor);
		drawParticle(skeleton.get(0), width*3f);
		if(agent.direction+eyeAngle > MathUtils.PI || 
				agent.direction+eyeAngle < 0) {
			drawEye(agent, skeleton, width, eyeAngle);
		}
		if(agent.direction-eyeAngle < 0) {
			drawEye(agent, skeleton, width, -eyeAngle);
		}
		drawHair(agent, cam);
	}
	
	public void drawHair(Agent agent, Camera cam) {
		batch.setColor(agent.hairColor);
		Vector3 pos = agent.skeleton.get(0).pos;
		float xDir = MathUtils.cos(agent.direction);
		float yDir = MathUtils.sin(agent.direction);
		float x = pos.x;
		float y = pos.y+pos.z*cam.depth;
		float hairWidth = 0.75f;
		RenderUtils.drawLine(batch, x-xDir, y-yDir, x+xDir*0.2f, y+yDir*0.2f, hairWidth, hairWidth, circle);
	}
	
	public void drawShadow(Agent agent) {
		batch.setColor(Color.BLACK);
		
		//draw actual stuff
		for(Particle3 p : agent.skeleton.particles) {
			drawCircle(p.pos.x, p.pos.y, 0, agent.skeleton.width*1.5f);
		}
		for(Constraint3 c : agent.skeleton.constraints) {
			utils.drawLine(c.a.pos.x, c.a.pos.y, c.b.pos.x, c.b.pos.y, agent.skeleton.width*2f);
		}
		Vector3 headPos = agent.skeleton.get(0).pos;
		drawCircle(headPos.x, headPos.y, 0, agent.skeleton.width*3f);
	}
	
	public void drawEye(Agent agent, Skeleton skeleton, float width, float angle) {
		Vector3 headPos = skeleton.get(0).pos;
		float r1 = width*2;
		float sin = MathUtils.sin(agent.direction+angle);
		float cos = MathUtils.cos(agent.direction+angle);
		float sincr = MathUtils.sin(agent.direction+angle+0.1f);
		float coscr = MathUtils.cos(agent.direction+angle+0.1f);
		batch.setColor(Color.WHITE);
		drawCircle(headPos.x+cos*r1, headPos.y+sin*r1, headPos.z, width*1.7f);
		batch.setColor(Color.BLACK);
		drawCircle(headPos.x+coscr*r1, headPos.y+sincr*r1, headPos.z, width);
	}
	
	public void drawLimb(Constraint3 c, float r) {
		utils.drawLine(c.a.pos.x, c.a.pos.y+c.a.pos.z*depth, 
				c.b.pos.x, c.b.pos.y+c.b.pos.z*depth, r);
	}
	
	public void drawShirt(Constraint3 c, float r1, float r2) {
		utils.drawLine(c.a.pos.x, c.a.pos.y+c.a.pos.z*depth, 
				c.b.pos.x, c.b.pos.y+c.b.pos.z*depth, r1, r2);
	}
	
	public void drawCircle(float x, float y, float z, float r) {
		utils.drawCircle(circle, x, y+z*depth, r);
	}
	
	public void drawParticle(Particle3 p, float r) {
		utils.drawCircle(circle, p.pos.x, p.pos.y+p.pos.z*depth, r);
	}
}
