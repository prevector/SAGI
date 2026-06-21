package com.buddha.editor;

import com.badlogic.gdx.utils.Array;
import com.buddha.agent.DepthComparable;

public class CloningMachine implements DepthComparable {
	
	public Array<TeslaCoil> teslaCoils = new Array<TeslaCoil>();
	
	public CloningMachine(float x, float y) {
		teslaCoils.add(new TeslaCoil(x, y, 0));
		teslaCoils.add(new TeslaCoil(x-8, y+10, 1));
		teslaCoils.add(new TeslaCoil(x+8, y+10, 2));
	}
	
	public void update() {
		for(TeslaCoil teslaCoil : teslaCoils) {
			teslaCoil.update();
		}
	}

	@Override
	public float getDepth() {
		float avgy = 0;
		for(TeslaCoil tc : teslaCoils) {
			avgy += tc.circle.particle.pos.y;
		}
		return avgy/teslaCoils.size;
	}

	public float getX() {
		float cx = 0;
		for(TeslaCoil tc : teslaCoils) {
			cx+=tc.circle.getX();
		}
		return cx/teslaCoils.size;
	}
	
	public float getY() {
		float cy = 0;
		for(TeslaCoil tc : teslaCoils) {
			cy+=tc.circle.getY();
		}
		return cy/teslaCoils.size;
	}
}
