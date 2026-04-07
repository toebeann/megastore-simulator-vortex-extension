/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
using System.Reflection.Metadata;

namespace DotNetUtils;

public record TypeRef(string Namespace, string Name)
{
    public TypeRef(TypeDefinition type, MetadataReader reader) : this(reader.GetString(type.Namespace), reader.GetString(type.Name)) { }
}
