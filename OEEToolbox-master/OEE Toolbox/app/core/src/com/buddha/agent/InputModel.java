package com.buddha.agent;

import java.util.HashMap;

import com.badlogic.gdx.utils.Array;
import com.buddha.simulation.Simulation;

public class InputModel {
	
	public static final String[] inputNamesBoolean = new String[]{"ball angle", "ball distance", "ball direction",
			"own goal angle", "own goal distance", "opp goal angle", "opp goal distance", "field edge angle", 
			"field edge distance", "team angle", "team distance", "team direction", "opp angle", "opp distance",
			"opp direction"};
	
	public static final String[] inputNamesInteger = new String[]{"nearest team inputs", "nearest opp inputs", 
			"fixed team inputs", "fixed opp inputs"};
	
	public Array<InputElement> inputs = new Array<InputElement>();
	public HashMap<Class<? extends InputElement>, Array<InputElement>> inputMap = 
			new HashMap<Class<? extends InputElement>, Array<InputElement>>();
	public int size;
	
	public InputModel() {
		
	}
	
	public void buildModel() {
		int idx = 0;
		for(InputElement e : inputs) {
			e.startIdx = idx;
			idx+=e.size;
		}
		this.size = getSize();
	}
	
	public float[] update(Simulation sim, Agent agent) {
		float[] input = new float[size];
		for(InputElement e : inputs) {
			e.update(sim, agent);
		}
		for(InputElement e : inputs) {
			for(int i = 0; i < e.size; i++) {
				input[i+e.startIdx] = e.input[i];
			}
		}
		return input;
	}
	
	public void addInputElement(InputElement element, Class<? extends InputElement> type) {
		inputs.add(element);
		Array<InputElement> elements = inputMap.get(type);
		if(elements == null) {
			elements = new Array<InputElement>();
			inputMap.put(type, elements);
		}
		elements.add(element);
	}
	
	@SuppressWarnings("unchecked")
	public <T extends InputElement> Array<T> getElementsOf(Class<T> type) {
		return (Array<T>)inputMap.get(type);
	}
	
	public int getSize() {
		int size = 0;
		for(InputElement e : inputs) {
			size+=e.size;
		}
		return size;
	}
}
