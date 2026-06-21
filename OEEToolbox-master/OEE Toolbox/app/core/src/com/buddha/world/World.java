package com.buddha.world;

import com.badlogic.gdx.utils.Array;

public class World {
	public Array<Constraint> constraints = new Array<Constraint>();
	public Array<Circle> circles = new Array<Circle>();
	public Array<AABB> triggers = new Array<AABB>();
	
	public AABB bounds;
	
	public World() {
		
	}
	
	public void update() {
		for(int i = 0; i < circles.size; i++) {
			Circle c = circles.get(i);
			c.update();
		}
	}
	
	public void addCircle(Circle circle) {
		circles.add(circle);
	}
	
	public void addConstraint(Constraint constraint) {
		constraints.add(constraint);
	}
	
	public void setBounds(AABB bounds) {
		this.bounds = bounds;
	}
	
	public void checkBounds() {
		if(bounds!=null) {
			for(Circle c : circles) {
				AABB.insideCollisions(bounds, c);
			}
		}
	}
	
	public static void solveCollision(Circle c1, Circle c2) {
		Constraint.solveFluid(c1.particle, c2.particle, c1.radius+c2.radius, 1);
	}
}
