/**
 * Generate a solvable shuffled puzzle state for the requested grid.
 *
 * @param {number} gridX - grid x value.
 * @param {number} gridY - grid y value.
 *
 * @returns {number[]} The shuffled pieces.
 */
export function generateSolvableShuffle(gridX: number, gridY: number): number[] {
    const n = gridX * gridY;
    const pieces: number[] = [...Array(n - 1).keys(), -1];

    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    // Fix solvability in one step: swapping any two non-blank tiles flips inversion parity
    if (!isSolvable(pieces, gridX, gridY)) {
        const first = pieces[0] !== -1 ? 0 : 1;
        const second = pieces[first + 1] !== -1 ? first + 1 : first + 2;
        [pieces[first], pieces[second]] = [pieces[second], pieces[first]];
    }

    // Guarantee not solved: one legal swap from solved is always solvable
    if (isSolved(pieces)) {
        const blankIdx = pieces.indexOf(-1);
        const swapIdx = blankIdx > 0 ? blankIdx - 1 : blankIdx + 1;
        [pieces[blankIdx], pieces[swapIdx]] = [pieces[swapIdx], pieces[blankIdx]];
    }

    return pieces;
}

/**
 * Merge two sorted halves, counting split inversions (pairs where left[i] > right[j]).
 *
 * @param {number[]} left - left half value.
 * @param {number[]} right - right half value.
 *
 * @returns {[number[], number]} Sorted merged array and the split inversion count.
 */
function mergeCount(left: number[], right: number[]): [number[], number] {
    const merged: number[] = [];
    let count = 0;
    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            merged.push(left[i++]);
        } else {
            count += left.length - i;
            merged.push(right[j++]);
        }
    }
    return [[...merged, ...left.slice(i), ...right.slice(j)], count];
}

/**
 * Sort arr and return the total inversion count via merge sort — O(n log n).
 *
 * @param {number[]} arr - array to sort value.
 *
 * @returns {[number[], number]} Sorted array and the total inversion count.
 */
function sortAndCount(arr: number[]): [number[], number] {
    if (arr.length <= 1) {
        return [arr, 0];
    }
    const mid = arr.length >> 1;
    const [left, lCount] = sortAndCount(arr.slice(0, mid));
    const [right, rCount] = sortAndCount(arr.slice(mid));
    const [merged, splitCount] = mergeCount(left, right);
    return [merged, lCount + rCount + splitCount];
}

/**
 * Count the number of inversions in the pieces array (excluding blank) — O(n log n).
 * An inversion is a pair (i, j) where i < j but pieces[i] > pieces[j].
 *
 * @param {number[]} pieces - piece values.
 *
 * @returns {number} The inversion count.
 */
function countInversions(pieces: number[]): number {
    return sortAndCount(pieces.filter((p) => p !== -1))[1];
}

/**
 * Check whether a puzzle state is solvable.
 *
 * @param {number[]} pieces - piece values.
 * @param {number} gridX - grid x value.
 * @param {number} gridY - grid y value.
 *
 * @returns {boolean} Whether the condition is met.
 */
export function isSolvable(pieces: number[], gridX: number, gridY: number): boolean {
    const inversions = countInversions(pieces);
    if (gridX % 2 === 1) {
        return inversions % 2 === 0;
    }
    const blankSlot = pieces.indexOf(-1);
    const blankRowFromBottom = gridY - Math.floor(blankSlot / gridX); // 1-indexed
    return (inversions + blankRowFromBottom) % 2 === 1;
}

/**
 * Check whether the current pieces state is the solved position.
 * Solved: pieces[i] === i for i < N-1, pieces[N-1] === -1.
 *
 * @param {number[]} pieces - piece values.
 *
 * @returns {boolean} Whether the condition is met.
 */
export function isSolved(pieces: number[]): boolean {
    const n = pieces.length;
    for (let i = 0; i < n - 1; i++) {
        if (pieces[i] !== i) {
            return false;
        }
    }
    return pieces[n - 1] === -1;
}

/**
 * Count how many pieces are in their correct slot (including the blank at N-1).
 *
 * @param {number[]} pieces - piece values.
 *
 * @returns {number} The correct piece count.
 */
export function countCorrectPieces(pieces: number[]): number {
    const n = pieces.length;
    let correct = 0;
    for (let i = 0; i < n - 1; i++) {
        if (pieces[i] === i) {
            correct++;
        }
    }
    if (pieces[n - 1] === -1) {
        correct++;
    }
    return correct;
}
