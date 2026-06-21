package com.buddha.simulation;

import java.util.HashMap;

import com.badlogic.gdx.math.MathUtils;
import com.buddha.agent.Agent;
import com.buddha.agent.Genotype;

public class Properties {
	
	public HashMap<String, Integer> integerMap = new HashMap<String, Integer>();
	public HashMap<String, Boolean> booleanMap = new HashMap<String, Boolean>();
	public HashMap<String, Float> floatMap = new HashMap<String, Float>();
	public HashMap<String, String> stringMap = new HashMap<String, String>();
	
	public static final String MAX_STRING = "maxv_";
	public static final String MIN_STRING = "minv_";
	public static Properties current = new Properties().initDefault();
	
	public Properties() {
		
	}
	
	public void setIProperty(String name, int value) {
		integerMap.put(name, value);
	}
	
	public int getIProperty(String name) {
		return integerMap.get(name);
	}
	
	public void setFProperty(String name, float value) {
		floatMap.put(name, value);
	}
	
	public float getFProperty(String name) {
		return floatMap.get(name);
	}
	
	public void setBProperty(String name, boolean value) {
		booleanMap.put(name, value);
	}
	
	public boolean getBProperty(String name) {
		return booleanMap.get(name);
	}
	
	public void setSProperty(String name, String value) {
		stringMap.put(name, value);
	}
	
	public String getSProperty(String name) {
		return stringMap.get(name);
	}
	
	public void setFProperty(String name, float value, float min, float max) {
		floatMap.put(name, value);
		floatMap.put(MAX_STRING+name, max);
		floatMap.put(MIN_STRING+name, min);
	}
	
	public void setIProperty(String name, int value, int min, int max) {
		integerMap.put(name, value);
		integerMap.put(MIN_STRING+name, min);
		integerMap.put(MAX_STRING+name, max);
	}
	
	public float getFMin(String name) {
		return floatMap.get(MIN_STRING+name);
	}
	
	public float getFMax(String name) {
		return floatMap.get(MAX_STRING+name);
	}
	
	public int getIMin(String name) {
		return integerMap.get(MIN_STRING+name);
	}
	
	public int getIMax(String name) {
		return integerMap.get(MAX_STRING+name);
	}
	
	public Properties defaultPlayer() {
		setBProperty("team angle", true);
		setBProperty("team distance", true);
		setBProperty("team direction", false);
		setBProperty("opp angle", true);
		setBProperty("opp distance", true);
		setBProperty("opp direction", false);
		setIProperty("nearest team inputs", 1, 0, 10);
		setIProperty("nearest opp inputs", 1, 0, 10);
		setIProperty("fixed team inputs", 0, 0, 10);
		setIProperty("fixed opp inputs", 0, 0, 10);
		setBProperty("ball angle", true);
		setBProperty("ball distance", true);
		setBProperty("ball direction", false);
		setBProperty("own goal angle", false);
		setBProperty("own goal distance", false);
		setBProperty("opp goal angle", true);
		setBProperty("opp goal distance", false);
		setBProperty("field edge distance", false);
		setBProperty("field edge angle", false);
		setIProperty("hidden layers", 2, 1, 9);
		setIProperty("layer size", 15, 1, 40);
		setSProperty("brain type", "FFNN");
		setIProperty("shoe color", MathUtils.random(Genotype.shoeColors.length-1), 0, Genotype.shoeColors.length-1);
		setIProperty("skin color", MathUtils.random(Genotype.skinColors.length-1), 0, Genotype.skinColors.length-1);
		setIProperty("hair color", MathUtils.random(Genotype.hairColors.length-1), 0, Genotype.hairColors.length-1);
		setFProperty("length", 1f, 0.1f, 4f);
		setSProperty("name", Agent.generateRandomName());
		return this;
	}
	
	public Properties initDefault() {
		setBProperty("hardcore", false);
		
		setFProperty("cutoff", 30, 10f, 110f);
		setIProperty("hidden layers", 2, 1, 9);
		setIProperty("layer size", 15, 1, 40);
		setFProperty("learning rate", 0.1f, 0.001f, 0.5f);
		setFProperty("standard deviation", 0.16f, 0.01f, 0.4f);
		setIProperty("tournaments", 4, 1, 12);
		setIProperty("rounds", 5, 2, 8);
		setIProperty("generations per cycle", 15, 1, 1000);
		setBProperty("show names", true);
		
		setFProperty("knockout", 3f, 1f, 90f);
		setIProperty("game duration", 10, 5, 180);
		return this;
	}

	
}
