package com.buddha.simulation;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input.Keys;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureAtlas;
import com.badlogic.gdx.math.Vector2;
import com.buddha.agent.Agent;
import com.buddha.agent.InputModel;
import com.buddha.agent.Team;
import com.buddha.editor.Editor;
import com.buddha.gui.GUI;
import com.buddha.render.Camera;
import com.buddha.render.EditorRenderer;
import com.buddha.render.SimulationRenderer;
import com.buddha.simulation.FootballEvolution.Tournament;

public class SimulationScreen implements Screen {

	public float width, height;

	public SpriteBatch batch;
	public TextureAtlas atlas;
	public Simulation simulation;
	public SimulationRenderer renderer;
	public FootballEvolution evolution;
	public InputModel inputModel;
	public GUI gui;

	public static final int SETUP = 0;
	public static final int TRAINING = 1;
	public static final int MATCH = 2;

	public int state = 0;
	public int gameDuration;
	public int ticksPerStep = 1;
	public boolean clicked = false;
	public Team team;
	public Agent selected = null;

	public static final int SELECTION = 0;
	public static final int GRAB = 1;
	public int tool = 0;
	public Agent grabbed;
	public Camera cam;

	// editor
	public Editor editor;
	public EditorRenderer editorRenderer;

	// save
	public AgentSaver saver = new AgentSaver();

	public SimulationScreen() {
		gui = new GUI(this);
		batch = new SpriteBatch();
		atlas = new TextureAtlas("spritesheet.txt");
		cam = new Camera();
		renderer = new SimulationRenderer(batch, atlas, cam);
		gui.setup();
		editorRenderer = new EditorRenderer(this, batch, atlas, cam);
		editor = new Editor();
		editor.populate(saver.genes);
		startSetup();
	}

	public void startTraining() {
		state = TRAINING;
		this.team = editor.getTeam();
		team.trainNext();
		gui = new GUI(this);
		gui.setupSimulation();
		setupExperiment();
	}

	public void setupExperiment() {
		state = TRAINING;
		int tournaments = Properties.current.getIProperty("tournaments");
		int selectionSize = (int) Math.pow(2, Properties.current.getIProperty("rounds"));
		evolution = new FootballEvolution(selectionSize, tournaments, team);
		startNewGame();
	}

	public void startSetup() {
		state = SETUP;
		cam.setPosition(Simulation.bounds.getCX(), Simulation.bounds.getCY() - 15);
		cam.setScale(0.15f);
		gui = new GUI(this);
		gui.setup();
	}

	public void startMatch() {
		state = MATCH;
		Team teamA = new Team(editor.getTeam());
		Team teamB = new Team(editor.getTeam());
		simulation = new Simulation(teamA, teamB, 90 * 60);
		cam.setPosition(Simulation.bounds.getCX(), Simulation.bounds.getCY());
		gui = new GUI(this);
		gui.match();
	}

	public void startNewGame() {
		gameDuration = Properties.current.getIProperty("game duration") * 60;
		Tournament tournament = evolution.next();
		int generationsPerCycle = Properties.current.getIProperty("generations per cycle");
		renderer.setSelected(null);
		if (tournament == null) {
			if (evolution.generation >= generationsPerCycle) {
				team.trainNext();
				setupExperiment();
				return;
			} else {
				evolution.nextGeneration();
				tournament = evolution.next();
			}
		}
		simulation = new Simulation(tournament.a, tournament.b, gameDuration);
	}

	@Override
	public void show() {

	}

	public void updateTraining() {
		for (int i = 0; i < ticksPerStep; i++) {
			simulation.update();
			// check if tournament is done
			if (simulation.ticks-- < 0) {
				startNewGame();
			}
		}
		renderer.render(simulation, this);
	}

	public void updateMatch() {
		simulation.update();
		simulation.ticks--;
		renderer.render(simulation, this);
	}

	@Override
	public void render(float delta) {
		Gdx.gl.glClearColor(.5f, .5f, .5f, 1);
		Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
		cam.update();
		if (state == TRAINING) {
			updateTraining();
		} else if (state == SETUP) {
			editor.update();
			if (editor.deleteFromMemory != null) {
				gui.deleteFromMemory(editor.deleteFromMemory);
				editor.deleteFromMemory = null;
			}
			editorRenderer.render(editor);
			if (editor.setupChanged) {
				editor.setupChanged = false;
				gui.updateTrainTable(editor.getTeamProperties());
			}
		} else if (state == MATCH) {
			updateMatch();
		}
		handleInput();
		gui.render();
	}

	public void handleInput() {
		int mx = Gdx.input.getX();
		int my = Gdx.input.getY();
		Vector2 worldPos = renderer.cam.screenToWorld(mx, my);
		if (state == SETUP) {
			editor.mouseOver(worldPos, Gdx.input.isTouched());
			editor.click(worldPos, Gdx.input.isTouched() && !clicked);
		}
		if (!clicked && Gdx.input.isTouched() && !gui.contains(mx, my)) {
			clicked = true;
			if (tool == SELECTION) {
				Agent sel = null;
				if (state == TRAINING) {
					sel = simulation.select(worldPos);
					renderer.setSelected(sel);
					if (sel != null) {
						gui.showBrainTable(sel);
						gui.playerOptionsTable(sel, false);
					}
				} else if (state == SETUP) {
					sel = editor.select(worldPos);
					if (sel != null)
						gui.playerOptionsTable(sel, sel.editable);
				}
				if (sel != selected) {
					if (sel != null)
						sel.selected = true;
					if (selected != null)
						selected.selected = false;
					selected = sel;
				}
			}
		} else {
			if (state == SETUP) {
				editor.click(worldPos, false);
			}
		}
		if (tool == GRAB) {
			grabbing(worldPos);
		}
		clicked = Gdx.input.isTouched();
		if (Gdx.input.isKeyJustPressed(Keys.R)) {
			renderer.fancy = !renderer.fancy;
		}
		if (Gdx.input.isKeyPressed(Keys.Z)) {
			renderer.cam.scale *= 0.99f;
		}
		if (Gdx.input.isKeyPressed(Keys.X)) {
			renderer.cam.scale /= 0.99f;
		}
		float camSpeed = 0.3f + 3 * renderer.cam.scale;
		if (Gdx.input.isKeyPressed(Keys.W)) {
			renderer.cam.y += camSpeed;
		}
		if (Gdx.input.isKeyPressed(Keys.A)) {
			renderer.cam.x -= camSpeed;
		}
		if (Gdx.input.isKeyPressed(Keys.S)) {
			renderer.cam.y -= camSpeed;
		}
		if (Gdx.input.isKeyPressed(Keys.D)) {
			renderer.cam.x += camSpeed;
		}
		if (state == SETUP || state == TRAINING)
			tool = gui.toolSelection.getCheckedIndex();
	}

	public void grabbing(Vector2 worldPos) {
		if (Gdx.input.isTouched()) {
			if (grabbed == null) {
				if (state == TRAINING) {
					grabbed = simulation.select(worldPos);
				} else if (state == SETUP) {
					grabbed = editor.select(worldPos);
				}
			} else {
				float height = 9;
				float zFac = cam.depth;
				grabbed.grabbed(worldPos.x, worldPos.y - height * zFac, height);
				grabbed.grabbed = true;
			}
		} else {
			if (grabbed != null) {
				grabbed.grabbed = false;
				grabbed = null;
			}
		}
	}

	@Override
	public void resize(int width, int height) {
		this.width = width;
		this.height = height;
		renderer.resize(width, height);
		gui.resize(width, height);
	}

	@Override
	public void pause() {

	}

	@Override
	public void resume() {

	}

	@Override
	public void hide() {

	}

	@Override
	public void dispose() {
		renderer.dispose();
		gui.dispose();
	}

}
