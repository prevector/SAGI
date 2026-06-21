package com.buddha.editor;

import com.buddha.world.AABB;

public class WorldButton {
	public AABB bounds;
	public int type;
	public boolean highlighted;
	public boolean clicked = false;
	public boolean down;
	
	public WorldButton(float x, float y, float width, float height) {
		bounds = new AABB(x, y, x+width, y+height);
	}

	public void clicked() {
		clicked = true;
	}
}
