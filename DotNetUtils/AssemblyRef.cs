using System.Reflection;

namespace DotNetUtils;

public record AssemblyRef(string? Name, Version? Version)
{
    internal AssemblyRef(AssemblyName a) : this(a.Name, a.Version) { }
    public static implicit operator AssemblyRef(AssemblyName a) => new(a);
}
