package com.buddha.simulation;

import com.badlogic.gdx.Game;

public class OEEToolbox extends Game {
	
	@Override
	public void create () {
		setScreen(new SimulationScreen());
	}

	@Override
	public void render () {
		super.render();
	}
	
	@Override
	public void dispose () {
		super.dispose();
	}
}
