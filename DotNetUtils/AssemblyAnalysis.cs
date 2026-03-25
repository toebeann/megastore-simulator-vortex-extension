namespace DotNetUtils;

public record AssemblyAnalysis(
    AssemblyRef Assembly,
    IEnumerable<AssemblyRef> BepInExAssemblies,
    IEnumerable<TypeRef> BepInExPatcherTypes,
    IEnumerable<TypeRef> BepInExPluginTypes);
