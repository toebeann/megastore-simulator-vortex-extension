using System.Diagnostics;
using System.Text.Json.Serialization;

namespace DotNetUtils;

[JsonSourceGenerationOptions]
[JsonSerializable(typeof(AssemblyAnalysis))]
[JsonSerializable(typeof(FileVersionInfo))]
internal partial class SourceGenerationContext : JsonSerializerContext { }
