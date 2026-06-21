package com.buddha.agent;

import java.util.Comparator;

import com.badlogic.gdx.math.Vector2;

public class DstComparer implements Comparator<Agent> {
	public Vector2 compareTo = null;
	public int compare(Agent a1, Agent a2) {
		if(a1.inactive()) {
			if(a2.inactive()) {
				return 0;
			} else {
				return 1;
			}
		} else if(a2.inactive()) {
			return -1;
		}
		return Float.compare(compareTo.dst2(a1.circle.particle.pos),
				compareTo.dst2(a2.circle.particle.pos));
	}
}
