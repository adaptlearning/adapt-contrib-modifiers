import Logging from 'core/js/logging';
import OfflineStorage from 'core/js/offlineStorage';
import Modifiers from 'extensions/adapt-contrib-modifiers/js/adapt-contrib-modifiers';

export default class ModifierSet extends Backbone.Controller {

  initialize(options = {}) {
    this._type = options._type;
    this._model = options.model;
    this._collection = this.model.getChildren();
    if (!this.originalModels) this.model._originalModels = this.collection.models;
    if (this.isAwaitingChildren) return;
    this.register();
    this.onModelConfigChange = _.debounce(this.onModelConfigChange.bind(this), 50);
    this._initConfig();
    this._setupListeners();
  }

  /**
   * Register the set
   */
  register() {
    Modifiers.register(this);
  }

  /**
   * Setup the models to be used in the set
   */
  setupModels() {
    Logging.error(`setupModels must be overriden for ${this.constructor.name}`);
  }

  /**
   * Reset models back to their original configuration
   */
  reset() {
    this._saveState(true);
    this.models = this.originalModels;
  }

  /**
   * Refresh models
   */
  refresh() {
    this._initConfig();
    this.setupModels();
  }

  /**
   * Returns the associated model ID
   * @returns {string}
   */
  get modelId() {
    return this.model.get('_id');
  }

  /**
   * Returns the set type
   * @returns {string}
   */
  get type() {
    return this._type;
  }

  /**
   * Returns the execution order of the set
   * @returns {number}
   */
  get order() {
    return 1;
  }

  /**
   * Returns whether the set is enabled
   * @returns {boolean}
   */
  get isEnabled() {
    return this._config?._isEnabled ?? false;
  }

  /**
   * Returns the model containing the config
   * @returns {AdaptModel}
   */
  get model() {
    return this._model;
  }

  /**
   * Returns the collection of child models
   * @returns {AdaptCollection}
   */
  get collection() {
    return this._collection;
  }

  /**
   * Returns the original unmodified child models associated with the model
   * @returns {[AdaptModel]}
   */
  get originalModels() {
    return this.model._originalModels;
  }

  /**
   * Returns the current child models associated with the model
   * @returns {[AdaptModel]}
   */
  get models() {
    return this.model.getAvailableChildModels();
  }

  /**
   * Set the child models associated with the model
   */
  set models(list) {
    this.originalModels.forEach(model => {
      const isIncluded = list.includes(model);
      const isStillAvailable = model._isAvailableChange ?? true;
      // don't include model in hierarchy check
      const isAvailableInHierarchy = model.getAncestorModels().every(model => model.get('_isAvailable'));
      const isAvailable = isIncluded && isStillAvailable && isAvailableInHierarchy;
      model.set('_isAvailable', isAvailable);
    });
  }

  /**
   * Returns whether all models have been added
   * @returns {boolean}
   */
  get isAwaitingChildren() {
    return this.model.get('_requireCompletionOf') === Number.POSITIVE_INFINITY;
  }

  /**
   * Returns the state to save to offlineStorage
   * @todo See if this can work for models outside blocks and components by looking at offsets from `_trackingId`
   * @returns {[_trackingId]}
   */
  get saveState() {
    return this.models.length > 0 ? this.models.map(model => model.get('_trackingId')) : null;
  }

  /**
   * Returns the state name for offlineStorage
   * @returns {String}
   */
  get saveStateName() {
    return this.type;
  }

  /**
   * @private
   */
  _initConfig() {}

  /**
   * @private
   */
  _setupListeners() {}

  /**
   * @private
   */
  _getSavedModels() {
    const storedData = OfflineStorage.get(this.saveStateName)?.[this.modelId];
    if (storedData) {
      const trackingIds = OfflineStorage.deserialize(storedData);
      return trackingIds.map(trackingId => this.models.find(model => model.get('_trackingId') === trackingId));
    }
    return null;
  }

  /**
   * @private
   */
  _triggerModelRefresh() {
    this.model.trigger('modifier:refresh');
  }

  /**
   * @private
   */
  _triggerModelModified() {
    this.model.trigger('modifier:modified');
  }

  /**
   * @private
   * @param {boolean} isReset
   */
  _saveState(isReset = false) {
    const data = OfflineStorage.get(this.saveStateName) ?? {};
    isReset ? delete data[this.modelId] : data[this.modelId] = OfflineStorage.serialize(this.saveState);
    OfflineStorage.set(this.saveStateName, data);
  }

  /**
   * @listens AdaptModel#change:[type]
   * @fires AdaptModel#modifier:modified
   */
  onModelConfigChange() {
    this._triggerModelModified();
  }

}
