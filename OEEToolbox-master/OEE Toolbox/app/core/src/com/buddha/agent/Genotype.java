package com.buddha.agent;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.math.MathUtils;
import com.buddha.math.BVector;
import com.buddha.neural.FFNN;
import com.buddha.neural.GRU;
import com.buddha.simulation.Properties;

public class Genotype {
	
	public BVector weights;
	public InputModel inputModel;
	public Properties properties;
	
	public static final Color[] skinColors = new Color[]{new Color(234f/255f,192f/255f,134f/255f, 1f), new Color(255f/255f,224/255f,196/255f, 1f),
			new Color(190/255f,114/255f,60/255f, 1f), new Color(204/255f,132/255f,67/255f, 1f)};
	public static final Color[] shoeColors = new Color[]{new Color(.2f, .2f, .2f, 1f), new Color(.4f, .1f, .1f, 1f) };
	public static final Color[] hairColors = new Color[]{new Color(0,0,0,1), Color.BROWN, Color.FIREBRICK, new Color(167f/255f,133/255f,106/255f,1),
			new Color(216/255f,192/255f,120/255f,1), new Color(216/255f,192/255f,120/255f,0f)};
	
	public Genotype() {
		
	}
	
	public Genotype(Properties properties) {
		this.properties = properties;
		resetGene();
	}
	
	public void buildInputModel() {
		inputModel = new InputModel();
		int teamNearestInputs = properties.getIProperty("nearest team inputs");
		int teamFixedInputs = properties.getIProperty("fixed team inputs");
		int oppNearestInputs = properties.getIProperty("nearest opp inputs");
		int oppFixedInputs = properties.getIProperty("fixed opp inputs");
		for(int i = 0; i < teamNearestInputs; i++) {
			inputModel.addInputElement(new PlayerInput(properties.getBProperty("team distance"), 
					properties.getBProperty("team angle"), false, i, true), PlayerInput.class);
		}
		for(int i = 0; i < teamFixedInputs; i++) {
			inputModel.addInputElement(new PlayerInput(properties.getBProperty("team distance"),
					properties.getBProperty("team angle"), true, i, true), PlayerInput.class);
		}
		for(int i = 0; i < oppNearestInputs; i++) {
			inputModel.addInputElement(new PlayerInput(properties.getBProperty("opp distance"), 
					properties.getBProperty("opp angle"), false, i, false), PlayerInput.class);
		}
		for(int i = 0; i < oppFixedInputs; i++) {
			inputModel.addInputElement(new PlayerInput(properties.getBProperty("opp distance"),
					properties.getBProperty("opp angle"), true, i, false), PlayerInput.class);
		}
		inputModel.addInputElement(new BallPositionInput(properties.getBProperty("ball distance"), 
				properties.getBProperty("ball angle"),  properties.getBProperty("ball direction")), BallPositionInput.class);
		inputModel.addInputElement(new GoalPositionInput(true, properties.getBProperty("own goal distance"), 
				properties.getBProperty("own goal angle")), GoalPositionInput.class);
		inputModel.addInputElement(new GoalPositionInput(false, properties.getBProperty("opp goal distance"), 
				properties.getBProperty("opp goal angle")), GoalPositionInput.class);
		inputModel.addInputElement(new FieldEdgeInput(properties.getBProperty("field edge distance"), 
				properties.getBProperty("field edge angle")), FieldEdgeInput.class);
		inputModel.buildModel();
	}
	
	public Genotype(Genotype genotype) {
		this.properties = genotype.properties;
		buildInputModel();
		this.weights = new BVector(genotype.weights);
	}
	
	public Genotype(Genotype genotype, BVector newGene) {
		this.weights = newGene;
		this.inputModel = genotype.inputModel;
		this.properties = genotype.properties;
	}

	public void resetGene() {
		buildInputModel();
		int brainSize = 0;
		if(properties.getSProperty("brain type") == "FFNN") {
			brainSize = FFNN.calcSize(inputModel, properties.getIProperty("layer size"), properties.getIProperty("hidden layers"), 5);
		} else {
			brainSize = GRU.getGeneSize(inputModel.getSize(), 5+properties.getIProperty("layer size"));
		}
		weights = new BVector(brainSize);
		float range = (float)(1.0/Math.sqrt(brainSize));
		for(int i = 0; i < brainSize; i++) {
			weights.vec[i] = MathUtils.random(-range, range);
		}
	}
}
