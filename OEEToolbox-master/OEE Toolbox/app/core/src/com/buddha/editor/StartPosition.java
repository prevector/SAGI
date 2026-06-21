package com.buddha.editor;

import com.buddha.agent.Agent;
import com.buddha.world.AABB;

public class StartPosition {
	public Agent agent;
	public AABB region;
	
	public StartPosition(AABB region) {
		this.region = region;
	}
}
