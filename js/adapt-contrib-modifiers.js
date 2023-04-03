import Adapt from 'core/js/adapt';
import OfflineStorage from 'core/js/offlineStorage';
import Wait from 'core/js/wait';
import Backbone from 'backbone';
import _ from 'underscore';

class Modifiers extends Backbone.Controller {

  initialize() {
    this._rawSets = [];
    this.listenTo(Adapt, {
      'adapt:start': this.onAdaptStart
    });
    // debounce to prevent multiple calls and limit to last call
    this._refreshModelSets = _.debounce(this._refreshModelSets, 50);
    this.onDebouncedModelIsAvailableChange = _.debounce(this.onDebouncedModelIsAvailableChange, 50);
  }

  /**
   * Register and order a configured root ModifierSet.
   * This is usually performed automatically upon ModifierSet instantiation.
   * @param {ModifierSet} newSet
   */
  register(set) {
    this._rawSets.push(set);
    this._rawSets.sort((a, b) => a.order - b.order);
  }

  /**
   * Returns registered root sets intersecting the given model id
   * @param {string} id
   * @returns {[ModifierSet]}
   */
  getSubsetsByModelId(id) {
    return this.subsets.filter(set => set.modelId === id);
  }

  /**
   * Returns registered root sets
   * @returns {[ModifierSet]}
   */
  get subsets() {
    return this._rawSets;
  }

  /**
   * Returns unique subset models
   * @returns {[AdaptModel]}
   */
  get models() {
    const models = this.subsets.reduce((models, set) => models.concat(set.model), []);
    return [...new Set(models)];
  }

  /**
   * @private
   */
  _setupListeners() {
    if (OfflineStorage.ready) {
      this.onOfflineStorageReady();
    } else {
      this.listenTo(Adapt, {
        'offlineStorage:ready': this.onOfflineStorageReady
      });
    }
    this.models.forEach(model => {
      const collection = model.getChildren();
      this.listenTo(collection, 'change:_isAvailable', this.onDebouncedModelIsAvailableChange);
      this.listenTo(model, {
        'modifier:refresh': () => this.onRefreshModel(model),
        'modifier:modified': () => this.onModelModified(model),
        'change:_isInteractionComplete': this.onModelIsInteractionCompleteChange,
        'reset': () => this.onModelReset(model)
      });
    });
  }

  /**
   * @private
   */
  _beginWait() {
    if (this._isWaiting) return;
    Wait.begin();
    this._isWaiting = true;
  }

  /**
   * @private
   */
  _endWait() {
    if (!this._isWaiting) return;
    Wait.end();
    this._isWaiting = false;
  }

  /**
   * @private
   */
  _refreshModelSets(model) {
    this._beginWait();
    const collection = model.getChildren();
    this.stopListening(collection, {
      'change:_isAvailable': this.onModelIsAvailableChange,
      'change:_isAvailable': this.onDebouncedModelIsAvailableChange
    });
    const sets = this.getSubsetsByModelId(model.get('_id'));
    sets.forEach(set => set.reset());
    sets.forEach(set => set.refresh());
    this.listenTo(collection, {
      'change:_isAvailable': this.onModelIsAvailableChange,
      'change:_isAvailable': this.onDebouncedModelIsAvailableChange
    });
    this._endWait();
  }

  /**
   * @listens Adapt#adapt:start
   */
  onAdaptStart() {
    // delay any listeners until all models have been restored
    this._setupListeners();
  }

  /**
   * @listens Adapt#offlineStorage:ready
   */
  onOfflineStorageReady() {
    this.subsets.forEach(set => set.setupModels());
  }

  /**
   * @listens AdaptModel#refresh
   */
  onRefreshModel(model) {
    this._refreshModelSets(model);
  }

  /**
   * @listens AdaptModel#modified
   */
  onModelModified(model) {
    this._refreshModelSets(model);
  }

  /**
   * @listens AdaptModel#change:_isInteractionComplete
   */
  onModelIsInteractionCompleteChange(model) {
    if (model.get('_isInteractionComplete')) return;
    this.onModelReset(model);
  }

  /**
   * @listens AdaptModel#reset
   */
  onModelReset(model) {
    const models = model.getChildren().models;
    models.forEach(model => delete model._isAvailableChange);
    this._refreshModelSets(model);
  }

  /**
   * @listens AdaptModel#change:_isAvailable
   */
  onModelIsAvailableChange(model) {
    const isAvailable = model.get('_isAvailable');
    model._isAvailableChange = isAvailable;
  }

  /**
   * @listens AdaptModel#change:_isAvailable
   */
  onDebouncedModelIsAvailableChange(model) {
    this._beginWait();
    model.getParent().reset();
  }

}

export default new Modifiers();
