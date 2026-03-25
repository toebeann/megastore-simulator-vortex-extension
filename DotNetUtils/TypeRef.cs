using System.Reflection.Metadata;

namespace DotNetUtils;

public record TypeRef(string Namespace, string Name)
{
    public TypeRef(TypeDefinition type, MetadataReader reader) : this(reader.GetString(type.Namespace), reader.GetString(type.Name)) { }
}