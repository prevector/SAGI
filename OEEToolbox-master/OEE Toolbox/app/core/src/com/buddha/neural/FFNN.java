package com.buddha.neural;

import java.util.function.Function;

import com.badlogic.gdx.math.MathUtils;
import com.buddha.agent.InputModel;
import com.buddha.math.BMatrix;
import com.buddha.math.BVector;

public class FFNN extends Brain {
	
	public static final Function<Float, Float> activation = x -> x > 0 ? x : 0;
	public static final Function<Float, Float> sigmoid = x -> (float)(1.0/(1+Math.exp(-x)));
	
	public BVector h;	//output
	public BVector[] layers;
	public BMatrix[] weights;
	
	public int inputNum;
	public int hiddenNum;
	public int outputNum;
	public int hiddenLayers;
	
	public FFNN(int inputNum, int hiddenNum, int outputNum, int hiddenLayers) {
		this.inputNum = inputNum;
		this.hiddenNum = hiddenNum;
		this.outputNum = outputNum;
		this.hiddenLayers = hiddenLayers;
	}
	
	@Override
	public void build(BVector genome) {
		for(int i = 0; i < genome.size; i++) {
			if(MathUtils.randomBoolean(0.3f))
				genome.vec[i] = 0;
		}
		int index = 0;
		layers = new BVector[hiddenLayers+2];	//hiddenlayers + input + output
		weights = new BMatrix[hiddenLayers+1];		//input -> hidden (*1), hidden->hidden (*hiddenLayers-1), hidden-> output (*1)
		layers[0] = new BVector(inputNum);
		for(int i = 0; i < hiddenLayers; i++) {
			weights[i] = new BMatrix(genome.vec, index, hiddenNum, i==0 ? inputNum+1 : hiddenNum+1);
			index+=weights[i].size();
			layers[i+1] = new BVector(hiddenNum);
		}
		weights[hiddenLayers] = new BMatrix(genome.vec, index, outputNum, hiddenNum+1);
		index+=weights[hiddenLayers].size();
		layers[hiddenLayers+1] = new BVector(outputNum);		//outputLayers
	}
	
	@Override
	public BVector update(BVector input) {
		layers[0].set(input);
		for(int i = 1; i < layers.length; i++) {
			//make vector one element larger and set 0th element to 1 (bias term)
			BVector layer = new BVector(layers[i-1].size+1);
			layer.set(layers[i-1].vec, 1, layers[i-1].size);
			layer.vec[0]=1;
			BVector.product(weights[i-1], layer, layers[i]);
			layers[i].apply(i== layers.length-1 ? sigmoid : activation);	
		}
		return layers[layers.length-1];
	}
	
	public static int calcSize(InputModel model, int layerSize, int layerNum, int outputNum) {
		int inputNum = model.getSize();
		return layerSize*(inputNum+1)+(layerNum-1)*layerSize*(layerSize+1)+outputNum*(layerSize+1);
	}
	
	public static float[] getRandomGene(int length, float range) {
		float[] array = new float[length];
		for(int i = 0; i < length; i++) {
			array[i] = MathUtils.random(-range, range);
		}
		return array;
	}
}
