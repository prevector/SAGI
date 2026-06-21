package com.buddha.gui;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.scenes.scene2d.Actor;
import com.badlogic.gdx.scenes.scene2d.InputEvent;
import com.badlogic.gdx.scenes.scene2d.InputListener;
import com.badlogic.gdx.scenes.scene2d.Stage;
import com.badlogic.gdx.scenes.scene2d.Touchable;
import com.badlogic.gdx.scenes.scene2d.ui.Button;
import com.badlogic.gdx.scenes.scene2d.ui.ButtonGroup;
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox;
import com.badlogic.gdx.scenes.scene2d.ui.Image;
import com.badlogic.gdx.scenes.scene2d.ui.Label;
import com.badlogic.gdx.scenes.scene2d.ui.Skin;
import com.badlogic.gdx.scenes.scene2d.ui.Slider;
import com.badlogic.gdx.scenes.scene2d.ui.Table;
import com.badlogic.gdx.scenes.scene2d.ui.TextButton;
import com.badlogic.gdx.scenes.scene2d.ui.TextField;
import com.badlogic.gdx.scenes.scene2d.ui.TextField.TextFieldFilter.DigitsOnlyFilter;
import com.badlogic.gdx.scenes.scene2d.ui.TextField.TextFieldListener;
import com.badlogic.gdx.scenes.scene2d.ui.Window;
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.viewport.ScreenViewport;
import com.buddha.agent.Agent;
import com.buddha.agent.Genotype;
import com.buddha.simulation.Properties;
import com.buddha.simulation.SimulationScreen;

import net.dermetfan.utils.math.MathUtils;

public class GUI {
	public Skin skin;
	public Stage stage;
	private SimulationScreen screen;
	private OrthographicCamera camera;

	// Main table
	public Table mainTable;

	// tickspeed
	public Label tickSpeedLabel;
	// generation
	public Label generationLabel;

	// options tabel
	public Array<TextFieldUpdater> textFieldUpdaters = new Array<TextFieldUpdater>();
	public Table optionsTable = null;
	

	// train table
	public Table trainTable = null;

	public Window savePlayersWindow = null;
	public ButtonGroup<TextButton> toolSelection;
	public ChangeListener emptyListener = new ChangeListener() {
		public void changed(ChangeEvent event, Actor actor) {
		}
	};

	int numBrainWindows = 0;

	public GUI(SimulationScreen screen) {
		this.screen = screen;
		skin = new Skin(Gdx.files.internal("uiskin.json"));
		camera = new OrthographicCamera();
		stage = new Stage(new ScreenViewport(camera));
		mainTable = new Table();
		mainTable.setFillParent(true);
		mainTable.setSkin(skin);
		Gdx.input.setInputProcessor(stage);
	}

	public void setupSimulation() {
		// construct interface
		mainTable.top().left().add(toolsTable()).left();
		mainTable.row().left();
		mainTable.add(speedTable()).row();
		generationLabel = new Label("generation 0", skin);
		mainTable.add(generationLabel).left().row();
		mainTable.add(optionsTable()).left();
		mainTable.setFillParent(true);
		stage.addActor(mainTable);
	}

	public void setup() {
		mainTable.top().left().add(toolsTable()).left().row();
		;
		mainTable.add(setupWindow());
		mainTable.setFillParent(true);
		stage.addActor(mainTable);
	}
	
	public void match() {
		// TODO Auto-generated method stub	
	}

	public Window setupWindow() {
		Window setupWindow = new Window("Setup", skin);
		Table table = new Table();
		table.add(this.getNumberField(Properties.current, "generations per cycle")).fill().pad(5).row();
		table.add(this.getNumberField(Properties.current, "rounds")).fill().pad(5).row();
		table.add(this.getNumberField(Properties.current, "tournaments")).fill().pad(5).row();
		setupWindow.add(table).padTop(20).row();
		trainTable = new Table();
		setupWindow.add(trainTable).row();
		final TextButton startButton = new TextButton("Start Training", skin);
		startButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				if (screen.editor.positionsFilled()) {
					screen.startTraining();
				} else {
					showDialog("Team isn't setup yet. Fill the gray squares.", "Ok", emptyListener);
				}
			}
		});
		setupWindow.add(startButton).pad(5);
		return setupWindow;
	}

	public void updateTrainTable(Array<Properties> trainingProperties) {
		trainTable.clear();
		trainTable.add(trainTable(trainingProperties));
	}

	public Table trainTable(Array<Properties> trainingProperties) {
		Table trainTable = new Table();
		for (Properties prop : trainingProperties) {
			trainTable.add(new Label(prop.getSProperty("name"), skin)).padRight(5);
			trainTable.add(getCheckBox(prop, "train")).row();
		}
		return trainTable;
	}

	public void showBrainTable(Agent agent) {
		// brain
		float bwWidth = 400;
		float bwHeight = 400;
		final Window brainWindow = new Window("" + agent.gene.properties.getSProperty("name") + "\'s brain", skin,
				"resizable");
		brainWindow.setPosition(numBrainWindows * 5, numBrainWindows * 5);
		numBrainWindows++;
		brainWindow.setResizable(true);
		FFNNRenderer renderer = new FFNNRenderer(agent, screen.atlas, bwWidth, bwHeight);
		Button closeButton = new Button(skin);
		closeButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				brainWindow.remove();
				numBrainWindows--;
			}
		});
		closeButton.add(new Image(skin.getDrawable("icon-close")));
		brainWindow.getTitleTable().add(closeButton);
		brainWindow.setSize(bwWidth, bwHeight);
		// brainWindow.setPosition(stage.getWidth()/2-bwWidth/2,
		// stage.getHeight()/2-bwHeight/2);
		brainWindow.add(renderer);
		brainWindow.addListener(renderer.inputListener);
		stage.addActor(brainWindow);
	}

	public void playerOptionsTable(Agent agent, boolean editable) {
		Properties properties = agent.gene.properties;
		final Window optionsWindow = new Window("Player Options", skin);
		optionsWindow.setMovable(false);
		optionsWindow.setResizable(false);
		Button closeButton = new Button(skin);
		closeButton.add(new Image(skin.getDrawable("icon-close")));
		closeButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				optionsWindow.remove();
			}
		});
		optionsWindow.getTitleTable().add(closeButton);

		final Table table = new Table();

		// table.add(new Label("name : ", skin));
		TextField nameField = new TextField(properties.getSProperty("name"), skin);
		nameField.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				properties.setSProperty("name", nameField.getText());
			}
		});
		table.add(nameField).pad(5).padTop(20).colspan(2).row();
		table.add(getNumberField(properties, "nearest team inputs")).colspan(2).fill(true, false).pad(5).row();
		table.add(getNumberField(properties, "nearest opp inputs")).colspan(2).fill(true, false).pad(5).row();
		table.add(getNumberField(properties, "fixed team inputs")).colspan(2).fill(true, false).pad(5).row();
		table.add(getNumberField(properties, "fixed opp inputs")).colspan(2).fill(true, false).pad(5).row();
		table.add(getCheckBox(properties, "team distance")).fill();
		table.add(getCheckBox(properties, "team angle")).fill().row();
		table.add(getCheckBox(properties, "ball distance")).fill();
		table.add(getCheckBox(properties, "ball angle")).fill().row();
		table.add(getCheckBox(properties, "ball direction")).fill();
		table.add(getCheckBox(properties, "own goal distance")).fill().row();
		table.add(getCheckBox(properties, "own goal angle")).fill();
		table.add(getCheckBox(properties, "opp goal distance")).fill().row();
		table.add(getCheckBox(properties, "opp goal angle")).fill();
		table.add(getCheckBox(properties, "field edge distance")).fill().row();
		table.add(getCheckBox(properties, "field edge angle")).fill().row();

		table.add(new Label("Brain Type:", skin)).row();
		ButtonGroup<TextButton> brainType = new ButtonGroup<TextButton>();
		TextButton ffnnButton = new TextButton("FFNN", skin, "toggle");
		TextButton gruButton = new TextButton("GRU", skin, "toggle");
		brainType.add(ffnnButton);
		brainType.add(gruButton);
		table.add(ffnnButton).fill(true, false);
		table.add(gruButton).fill(true, false).row();
		brainType.setChecked(properties.getSProperty("brain type"));
		Table ffnnTable = new Table();
		ffnnTable.add(getNumberField(properties, "layer size")).fill().pad(5).row();
		ffnnTable.add(getNumberField(properties, "hidden layers")).fill().pad(5);
		Table gruTable = new Table();
		gruTable.add(getNumberField(properties, "layer size")).fill().pad(5);
		Table brainTable = new Table();
		brainTable.add(properties.getSProperty("brain type") == "FFNN" ? ffnnTable : gruTable);
		table.add(brainTable).colspan(2).row();
		ffnnButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				properties.setSProperty("brain type", "FFNN");
				brainTable.clear();
				brainTable.add(ffnnTable);
			}
		});
		gruButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				properties.setSProperty("brain type", "GRU");
				brainTable.clear();
				brainTable.add(gruTable);
			}
		});

		table.add(getSlider(agent.gene.properties, "length")).colspan(2).pad(5).row();
		table.setFillParent(true);
		optionsWindow.add(table);
		if (!editable) {
			table.setColor(1, 1, 1, 0.6f);
			table.setTouchable(Touchable.disabled);
		}
		table.left();
		if (optionsTable != null) {
			optionsTable.remove();
		}
		optionsTable = new Table();
		optionsTable.top().right().add(optionsWindow);
		optionsTable.setFillParent(true);
		stage.addActor(optionsTable);
	}

	public Window savePlayers(Array<Genotype> genotypes) {
		float width = 400;
		float height = 400;
		savePlayersWindow = new Window("save players", skin);
		savePlayersWindow.setResizable(false);
		savePlayersWindow.setMovable(true);
		savePlayersWindow.setSize(width, height);
		savePlayersWindow.setPosition(stage.getWidth() / 2 - width / 2, stage.getHeight() - height / 2);
		Properties prop = new Properties();
		Table table = new Table();
		Label question = new Label("Select which players you want to save/overwrite", skin);
		table.add(question).colspan(2).padTop(20).row();
		for (int i = 0; i < genotypes.size; i++) {
			Genotype genotype = genotypes.get(i);
			String geneName = genotype.properties.getSProperty("name");
			prop.setBProperty(geneName, true);
			table.center().add(this.getCheckBox(prop, geneName)).colspan(2).row();
		}
		Button save = new TextButton("save", skin);
		save.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				for (int i = 0; i < genotypes.size; i++) {
					Genotype genotype = genotypes.get(i);
					String geneName = genotype.properties.getSProperty("name");
					if (prop.getBProperty(geneName)) {
						screen.saver.save(genotype);
					}
				}
				savePlayersWindow.remove();
				savePlayersWindow = null;
			}
		});
		table.right().add(save).pad(5);
		Button cancel = new TextButton("cancel", skin);
		cancel.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				savePlayersWindow.remove();
				savePlayersWindow = null;
			}
		});
		table.left().add(cancel).pad(5).row();
		savePlayersWindow.add(table);
		return savePlayersWindow;
	}

	public Table optionsTable() {
		float buttonWidth = 150;
		Window table = new Window("settings", skin);
		table.setMovable(false);
		// button to hide table
		CheckBox showSettings = new CheckBox("settings", skin);
		showSettings.setChecked(true);
		showSettings.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				table.setVisible(showSettings.isChecked());
			}
		});
		mainTable.add(showSettings).left().row();

		// rule table
		final Table rules = new Table();
		rules.add(new Label("rules are updated per generation", skin)).row();
		rules.add(getCheckBox(Properties.current, "hardcore")).fill().row();
		rules.add(getCheckBox(Properties.current, "show names")).fill().row();
		rules.add(getSlider(Properties.current, "knockout")).fill().row();
		rules.add(getNumberField(Properties.current, "game duration")).fill().row();
		rules.add(getSlider(Properties.current, "learning rate")).fill().row();
		rules.add(getSlider(Properties.current, "standard deviation")).fill().row();
		table.add(rules);

		table.row();
		final TextButton apply = new TextButton("apply", skin);
		apply.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				applyChanges();
			}
		});
		table.add(apply).width(buttonWidth).pad(5).row();
		final TextButton saveButton = new TextButton("Save", skin);
		saveButton.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				if (savePlayersWindow == null) {
					savePlayersWindow = savePlayers(screen.evolution.team.genotypes);
					stage.addActor(savePlayersWindow);
					savePlayersWindow.validate();
				}
			}
		});
		table.add(saveButton).width(buttonWidth).pad(5).row();
		ChangeListener newExperiment = new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				screen.startSetup();
			}
		};
		final TextButton setupNewExperiment = new TextButton("New Experiment", skin);
		setupNewExperiment.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				showDialog("Setup new experiment? All progress will be lost.", "New Experiment", newExperiment);
			}
		});
		table.add(setupNewExperiment).width(buttonWidth).pad(5).row();
		return table;
	}

	public Table toolsTable() {
		Table table = new Table();
		TextButton select = new TextButton("select", skin, "toggle");
		TextButton drag = new TextButton("grab", skin, "toggle");
		toolSelection = new ButtonGroup<TextButton>(select, drag);
		toolSelection.setChecked("select");
		table.add(select).width(40);
		table.add(drag).width(40);
		return table;
	}

	public void updateSimulationInfo() {
		updateSpeed(screen);
		// infolabel
		String info = String.format("generation %d of %d, now training %s \nTournament %d of %d, selection %d", screen.evolution.generation, 
				Properties.current.getIProperty("generations per cycle"), screen.evolution.team.getGene().properties.getSProperty("name"),
				screen.evolution.selectionIdx + 1, screen.evolution.numTournaments,
				screen.evolution.selections.get(screen.evolution.selectionIdx).tournaments.size);
		generationLabel.setText(info);
	}

	public Table speedTable() {
		Table table = new Table();
		tickSpeedLabel = new Label("x 1", skin);

		final TextButton normal = new TextButton("x1", skin);
		normal.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				screen.ticksPerStep = 1;
			}
		});
		final TextButton speedUp = new TextButton("+", skin);
		speedUp.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				screen.ticksPerStep *= 2;
			}
		});
		final TextButton speedDown = new TextButton("-", skin);
		speedDown.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				screen.ticksPerStep /= 2;
			}
		});

		float sz = 20;
		table.add(normal).pad(2).size(sz);
		table.add(speedDown).pad(2).size(sz);
		table.add(speedUp).pad(2).size(sz);
		table.add(tickSpeedLabel).height(sz);
		screen.ticksPerStep = MathUtils.clamp(screen.ticksPerStep, 1, 1024);
		return table;
	}

	public CheckBox getCheckBox(Properties properties, String name) {
		final CheckBox box = new CheckBox(name, skin);
		box.setChecked(properties.getBProperty(name));
		box.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				properties.setBProperty(name, box.isChecked());
			}
		});
		box.left();
		return box;
	}

	public Table getSlider(Properties properties, String name) {
		final Table table = new Table();

		float min = properties.getFMin(name);
		float max = properties.getFMax(name);
		float val = properties.getFProperty(name);
		Slider slider = new Slider(min, max, (max - min) / 30f, false, skin);
		slider.setValue(val);
		slider.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				properties.setFProperty(name, slider.getValue());
			}
		});
		InputListener stopTouchDown = new InputListener() {
			public boolean touchDown(InputEvent event, float x, float y, int pointer, int button) {
				event.stop();
				return false;
			}
		};
		slider.addListener(stopTouchDown);
		table.add(new Label(name + " ", skin));
		table.right();
		table.add(slider);
		return table;
	}

	public Table getNumberField(Properties properties, String name) {
		Table table = new Table();
		table.add(new Label(name, skin)).space(5);
		int value = properties.getIProperty(name);
		final TextField field = new TextField(Integer.toString(value), skin);
		field.setTextFieldFilter(new DigitsOnlyFilter());
		TextFieldUpdater updater = this.addTextFieldUpdater(field, properties, name);
		field.setTextFieldListener(new TextFieldListener() {
			public void keyTyped(TextField textField, char c) {
				String text = textField.getText();
				if (text.length() > 3) {
					textField.setText(text.substring(0, text.length() - 1));
				}
				updater.update();
			}
		});
		TextButton plus = new TextButton("+", skin, "blue");
		TextButton minus = new TextButton("-", skin, "blue");
		plus.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				String text = field.getText();
				if (text.length() == 0) {
					text = "0";
				}
				field.setText(Integer.toString(Integer.parseInt(text) + 1));
				updater.update();
			}
		});
		minus.addListener(new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				String text = field.getText();
				if (text.length() == 0) {
					text = "0";
				}
				field.setText(Integer.toString(Integer.parseInt(text) - 1));
				updater.update();
			}
		});
		table.right();
		table.add(minus).width(16);
		table.add(field).width(40);
		table.add(plus).width(16);
		return table;
	}

	public void showDialog(String text, String confirmText, ChangeListener listener) {
		float width = 400;
		float height = 200;
		Window dialog = new Window(" ", skin);
		ChangeListener removeListener = new ChangeListener() {
			public void changed(ChangeEvent event, Actor actor) {
				dialog.remove();
			}
		};
		dialog.setWidth(width);
		dialog.setHeight(height);
		dialog.setMovable(true);
		dialog.setResizable(false);
		dialog.setPosition(stage.getWidth() / 2 - width / 2, stage.getHeight() - height / 2);
		dialog.add(new Label(text, skin)).colspan(2).row();
		TextButton actionButton = new TextButton(confirmText, skin);
		if (listener != null) {
			actionButton.addListener(listener);
		}
		actionButton.addListener(removeListener);
		dialog.add(actionButton);
		TextButton cancelButton = new TextButton("Cancel", skin);
		cancelButton.addListener(removeListener);
		dialog.add(cancelButton);
		stage.addActor(dialog);
	}

	public void deleteFromMemory(Agent agent) {
		this.showDialog("Do you want to delete " + agent.gene.properties.getSProperty("name") + " from memory?", "Yes",
				new ChangeListener() {
					public void changed(ChangeEvent event, Actor actor) {
						screen.saver.delete(agent.gene.properties.getSProperty("name"));
					}
				});
	}

	public void updateSpeed(SimulationScreen screen) {
		if (tickSpeedLabel != null) {
			screen.ticksPerStep = MathUtils.clamp(screen.ticksPerStep, 1, 1024);
			tickSpeedLabel.setText("x " + Integer.toString(screen.ticksPerStep));
		}
	}

	public void render() {
		if (screen.state == SimulationScreen.TRAINING) {
			updateSimulationInfo();
		}
		stage.act();
		stage.draw();
	}

	public boolean contains(float x, float y) {
		Actor actor = stage.hit(x, stage.getHeight() - y, true);
		if (actor != null)
			return true;
		return false;
	}

	public void resize(int width, int height) {
		stage.getViewport().update(width, height, true);
	}

	public void dispose() {
		stage.dispose();
		skin.dispose();
	}

	public TextFieldUpdater addTextFieldUpdater(TextField textField, Properties properties, String name) {
		TextFieldUpdater updater = new TextFieldUpdater(textField, properties, name);
		textFieldUpdaters.add(updater);
		return updater;
	}

	public void applyChanges() {
		for (TextFieldUpdater updater : textFieldUpdaters) {
			updater.update();
		}
	}

	public class TextFieldUpdater {
		public TextField textField;
		public String name;
		public Properties properties;

		public TextFieldUpdater(TextField textField, Properties properties, String name) {
			this.textField = textField;
			this.name = name;
			this.properties = properties;
		}

		public void update() {
			String text = textField.getText();
			if (text.length() == 0) {
				text = "0";
			}
			int value = Integer.parseInt(text);
			int max = properties.getIMax(name);
			int min = properties.getIMin(name);
			value = MathUtils.clamp(value, min, max);
			textField.setText(Integer.toString(value));
			properties.setIProperty(name, value);
		}
	}
}
