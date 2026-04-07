/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
using System.Reflection;

namespace DotNetUtils;

public record AssemblyRef(string? Name, Version? Version)
{
    internal AssemblyRef(AssemblyName a) : this(a.Name, a.Version) { }
    public static implicit operator AssemblyRef(AssemblyName a) => new(a);
}
