package com.buddha.editor;

import com.badlogic.gdx.math.MathUtils;
import com.buddha.world.AABB;

public class Incinerator {
	
	public AABB bounds;
	
	public Incinerator(float x, float y, float width, float height) {
		bounds = new AABB(x, y, x+width, y+height);
	}
	
	public void update(Editor editor) {
		if(MathUtils.randomBoolean(0.12f)) {
			float rx = MathUtils.random(bounds.x1+1, bounds.x2-1);
			float ry = MathUtils.random(bounds.y1+1, bounds.y2-1);
			editor.addFlame(new Flame(rx, ry));
		}
	}
}
