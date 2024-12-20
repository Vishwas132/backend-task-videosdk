/**
 * A priority queue implementation using a binary heap
 * Higher priority items are processed first
 */
export class PriorityQueue {
  constructor() {
    this.values = [];
  }

  /**
   * Add an item to the queue with a given priority
   * @param {*} item The item to enqueue
   * @param {number} priority Priority value (higher numbers = higher priority)
   */
  enqueue(item, priority) {
    const element = { item, priority };
    this.values.push(element);
    this._bubbleUp();
  }

  /**
   * Remove and return the highest priority item
   * @returns {*} The highest priority item
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const max = this.values[0];
    const end = this.values.pop();

    if (this.values.length > 0) {
      this.values[0] = end;
      this._sinkDown();
    }

    return max.item;
  }

  /**
   * Look at the highest priority item without removing it
   * @returns {*} The highest priority item
   */
  peek() {
    return this.isEmpty() ? null : this.values[0].item;
  }

  /**
   * Check if the queue is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.values.length === 0;
  }

  /**
   * Get the number of items in the queue
   * @returns {number}
   */
  size() {
    return this.values.length;
  }

  /**
   * Move a newly added element up to its proper position
   * @private
   */
  _bubbleUp() {
    let idx = this.values.length - 1;
    const element = this.values[idx];

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.values[parentIdx];

      if (element.priority <= parent.priority) {
        break;
      }

      this.values[parentIdx] = element;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  /**
   * Move an element down to its proper position
   * @private
   */
  _sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];

    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this.values[leftChildIdx];
        if (leftChild.priority > element.priority) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.values[rightChildIdx];
        if (
          (!swap && rightChild.priority > element.priority) ||
          (swap && rightChild.priority > leftChild.priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (!swap) break;

      this.values[idx] = this.values[swap];
      this.values[swap] = element;
      idx = swap;
    }
  }

  /**
   * Clear all items from the queue
   */
  clear() {
    this.values = [];
  }

  /**
   * Convert the queue to an array (for debugging)
   * @returns {Array} Array of items in priority order
   */
  toArray() {
    return [...this.values]
      .sort((a, b) => b.priority - a.priority)
      .map((v) => v.item);
  }
}
