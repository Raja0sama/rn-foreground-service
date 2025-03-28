import { NativeModules, Platform, Linking, DeviceEventEmitter } from 'react-native';
import taskScheduler from './TaskScheduler';

// Try to get the battery module if available
const BatteryManagerModule = NativeModules.BatteryManager || null;

class BatteryOptimizationManager {
  constructor() {
    this.batteryLevel = 1.0;
    this.isCharging = false;
    this.isOptimized = true;  // Assume battery optimization is enabled by default
    this.listeners = [];
    this.isMonitoring = false;
    this.eventEmitter = null;
    this.vendorOptimizations = {};
  }

  /**
   * Start monitoring battery state
   * @returns {Promise<boolean>} Whether monitoring was successfully started
   */
  async startMonitoring() {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (this.isMonitoring) {
      return true;
    }

    try {
      if (BatteryManagerModule) {
        // Start native battery monitoring
        await BatteryManagerModule.startMonitoring();

        // Listen for battery updates
        this.eventEmitter = DeviceEventEmitter.addListener(
          'BatteryStatus',
          this.handleBatteryUpdate
        );

        // Get initial battery state
        const initialBattery = await BatteryManagerModule.getBatteryStatus();
        this.batteryLevel = initialBattery.level;
        this.isCharging = initialBattery.isCharging;

        // Check if device is battery optimized
        this.isOptimized = await this.isIgnoringBatteryOptimizations();

        // Update task scheduler with battery info
        taskScheduler.updateBatteryInfo(this.batteryLevel, this.isCharging);

        this.isMonitoring = true;
        return true;
      }
      
      // Fallback to just checking battery optimization without monitoring
      this.isOptimized = await this.isIgnoringBatteryOptimizations();
      return false;
    } catch (error) {
      console.warn('Failed to start battery monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring battery state
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    try {
      if (BatteryManagerModule) {
        BatteryManagerModule.stopMonitoring();
      }

      if (this.eventEmitter) {
        this.eventEmitter.remove();
        this.eventEmitter = null;
      }

      this.isMonitoring = false;
    } catch (error) {
      console.warn('Error stopping battery monitoring:', error);
    }
  }

  /**
   * Handle battery status updates
   * @param {Object} batteryStatus Battery status object
   */
  handleBatteryUpdate = (batteryStatus) => {
    this.batteryLevel = batteryStatus.level;
    this.isCharging = batteryStatus.isCharging;

    // Update task scheduler with new battery info
    taskScheduler.updateBatteryInfo(this.batteryLevel, this.isCharging);

    // Notify listeners
    this.notifyListeners();
  };

  /**
   * Check if the device is ignoring battery optimizations
   * @returns {Promise<boolean>} Whether battery optimizations are being ignored
   */
  async isIgnoringBatteryOptimizations() {
    if (Platform.OS !== 'android') {
      return true; // Not applicable for iOS
    }

    try {
      if (BatteryManagerModule) {
        return await BatteryManagerModule.isIgnoringBatteryOptimizations();
      }
      return false; // Default to false if module not available
    } catch (error) {
      console.warn('Error checking battery optimization status:', error);
      return false;
    }
  }

  /**
   * Request to disable battery optimization
   * @returns {Promise<boolean>} Whether the request was successful
   */
  async requestDisableBatteryOptimization() {
    if (Platform.OS !== 'android') {
      return false; // Not applicable for iOS
    }

    try {
      if (BatteryManagerModule) {
        const result = await BatteryManagerModule.requestDisableBatteryOptimization();
        if (result) {
          this.isOptimized = !(await this.isIgnoringBatteryOptimizations());
          this.notifyListeners();
        }
        return result;
      } else {
        // Fallback: Open battery optimization settings
        return await Linking.openSettings();
      }
    } catch (error) {
      console.warn('Error requesting to disable battery optimization:', error);
      return false;
    }
  }

  /**
   * Check for vendor-specific battery optimizations (Huawei, Xiaomi, etc.)
   * @returns {Promise<Object>} Object with vendor-specific optimization info
   */
  async checkVendorOptimizations() {
    if (Platform.OS !== 'android') {
      return {}; // Not applicable for iOS
    }

    try {
      if (BatteryManagerModule && BatteryManagerModule.checkVendorOptimizations) {
        this.vendorOptimizations = await BatteryManagerModule.checkVendorOptimizations();
        return this.vendorOptimizations;
      }
      return {};
    } catch (error) {
      console.warn('Error checking vendor optimizations:', error);
      return {};
    }
  }

  /**
   * Open vendor-specific battery optimization settings
   * @param {string} vendor Vendor name
   * @returns {Promise<boolean>} Whether the settings were opened successfully
   */
  async openVendorOptimizationSettings(vendor) {
    if (Platform.OS !== 'android') {
      return false; // Not applicable for iOS
    }

    try {
      if (BatteryManagerModule && BatteryManagerModule.openVendorOptimizationSettings) {
        return await BatteryManagerModule.openVendorOptimizationSettings(vendor);
      }
      return false;
    } catch (error) {
      console.warn(`Error opening ${vendor} optimization settings:`, error);
      return false;
    }
  }

  /**
   * Get current battery status
   * @returns {Object} Current battery status
   */
  getBatteryStatus() {
    return {
      level: this.batteryLevel,
      isCharging: this.isCharging,
      isOptimized: this.isOptimized,
      vendorOptimizations: this.vendorOptimizations
    };
  }

  /**
   * Add a listener for battery status changes
   * @param {Function} listener Callback function
   * @returns {Function} Function to remove the listener
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(listener);

    // Return function to remove this listener
    return () => {
      this.removeListener(listener);
    };
  }

  /**
   * Remove a battery status listener
   * @param {Function} listener Listener to remove
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of battery status changes
   */
  notifyListeners() {
    const status = this.getBatteryStatus();

    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.warn('Error in battery status listener:', error);
      }
    });
  }
}

// Create singleton instance
const batteryOptimizationManager = new BatteryOptimizationManager();

export default batteryOptimizationManager;