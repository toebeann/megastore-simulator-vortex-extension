/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * An async implementation of the Array.some() method which executes the predicates in series.
 * Short-circuits on the first predicate that resolves true, or when a predicate rejects if swallowRejects is false.
 * @param array
 * @param predicate
 * @param swallowRejections Whether rejected promises should be swallowed or rejected.
 * Swallowed rejections are treated as false predicate results.
 * Defaults to true.
 * @returns Whether any value in the array passes the predicate.
 */
export const someSeries = async <T>(
  array: T[],
  predicate: (value: T) => Promise<boolean>,
  swallowRejections = true,
) => {
  for (const value of array) {
    try {
      if (await predicate(value)) return true;
    } catch (error) {
      if (!swallowRejections) {
        throw new Error(
          `The value of ${value} was rejected with the following error: ${error}`,
        );
      }
    }
  }
  return false;
};

/**
 * An async implementation of the Array.some() method which executes the predicates in parallel.
 * Short-circuits on the first predicate that resolves true, or when a predicate rejects if swallowRejects is false.
 * @param array
 * @param predicate
 * @param swallowRejections Whether rejected promises should be swallowed or rejected.
 * Swallowed rejections are treated as false predicate results.
 * Defaults to true.
 * @returns Whether any value in the array passes the predicate.
 */
export const some = <T>(
  array: T[],
  predicate: (value: T) => Promise<boolean>,
  swallowRejections = true,
) =>
  new Promise<boolean>((resolve, reject) => {
    Promise.allSettled(
      array.map((value) =>
        predicate(value)
          .then((result) => {
            if (result) resolve(true);
          })
          .catch((error) => {
            if (!swallowRejections) {
              reject(
                new Error(
                  `The value of ${value} was rejected with the following error: ${error}`,
                ),
              );
            }
          })
      ),
    )
      .then(() => resolve(false));
  });
