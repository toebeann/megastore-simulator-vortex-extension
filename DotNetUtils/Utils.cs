/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
using AssetsTools.NET.Extra;
using Microsoft.JavaScript.NodeApi;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;

namespace DotNetUtils;

[JSExport]
public static class Utils
{
    public static string? GetApplicationVersion(string gameDataPath, string tpkPath)
    {
        var manager = new AssetsManager();
        var instance = gameDataPath switch
        {
            string path when File.Exists(Path.Combine(path, "globalgamemanagers")) =>
                manager.LoadAssetsFile(Path.Combine(path, "globalgamemanagers")),

            string path when File.Exists(Path.Combine(path, "mainData")) =>
                manager.LoadAssetsFile(Path.Combine(path, "mainData")),

            string path => manager.LoadAssetsFileFromBundle(
                manager.LoadBundleFile(Path.Combine(path, "data.unity3d")),
                "globalgamemanagers"),
        };

        manager.LoadClassPackage(tpkPath);

        if (!instance.file.Metadata.TypeTreeEnabled)
            manager.LoadClassDatabaseFromPackage(instance.file.Metadata.UnityVersion);

        var playerSettings = instance.file.GetAssetsOfType(AssetClassID.PlayerSettings).First();
        var baseField = manager.GetBaseField(instance, playerSettings);

        var result = baseField?.Get("bundleVersion") switch
        {
            { TypeName: "string", AsString: var str } => str,
            _ => null
        };

        manager.UnloadAll(true);
        return result;
    }

    private static string? GetFullName(CustomAttribute attribute, MetadataReader reader)
    {
        switch (attribute.Constructor.Kind)
        {
            case HandleKind.MethodDefinition:
                {
                    MethodDefinition methodDefinition = reader.GetMethodDefinition((MethodDefinitionHandle)attribute.Constructor);
                    TypeDefinition typeDefinition = reader.GetTypeDefinition(methodDefinition.GetDeclaringType());
                    string @namespace = reader.GetString(typeDefinition.Namespace);
                    string name = reader.GetString(typeDefinition.Name);
                    return $"{@namespace}.{name}";
                }

            case HandleKind.MemberReference:
                MemberReference memberReference = reader.GetMemberReference((MemberReferenceHandle)attribute.Constructor);

                switch (memberReference.Parent.Kind)
                {
                    case HandleKind.TypeReference:
                        {
                            TypeReference typeReference = reader.GetTypeReference((TypeReferenceHandle)memberReference.Parent);
                            string @namespace = reader.GetString(typeReference.Namespace);
                            string name = reader.GetString(typeReference.Name);
                            return $"{@namespace}.{name}";
                        }

                    case HandleKind.TypeDefinition:
                        {
                            TypeDefinition typeDefinition = reader.GetTypeDefinition((TypeDefinitionHandle)memberReference.Parent);
                            string @namespace = reader.GetString(typeDefinition.Namespace);
                            string name = reader.GetString(typeDefinition.Name);
                            return $"{@namespace}.{name}";
                        }
                }
                break;
        }

        return null;
    }

    public static string AnalyzeAssembly(string path)
    {
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var peReader = new PEReader(fs);
        MetadataReader reader = peReader.GetMetadataReader();
        var definition = reader.GetAssemblyDefinition();
        var references = reader.AssemblyReferences.Select(r => (AssemblyRef)reader.GetAssemblyReference(r).GetAssemblyName());
        var bepinex = references.Where(static r => r.Name?.StartsWith("BepInEx") ?? false);
        var result = new AssemblyAnalysis(
            Assembly: definition.GetAssemblyName(),

            References: references,

            BepInExPatcherTypes: bepinex switch
            {
                _ when bepinex.Any(static a => a.Version?.Major == 6) => reader.TypeDefinitions
                    .Select(reader.GetTypeDefinition)
                    .Where(type => type.GetCustomAttributes()
                        .Any(attr => GetFullName(reader.GetCustomAttribute(attr), reader) is string name
                            && name.StartsWith("BepInEx.") && name.EndsWith(".PatcherPluginInfoAttribute")))
                    .Select(type => new TypeRef(type, reader)),

                _ when bepinex.Any(static a => a.Name == "BepInEx" && a.Version?.Major == 5) => reader.TypeDefinitions
                    .Select(reader.GetTypeDefinition)
                    .Where(type => type.GetProperties()
                        .Any(prop => reader.GetString(reader.GetPropertyDefinition(prop).Name) == "TargetDLLs")
                            && type.GetMethods()
                                .Any(method => reader.GetString(reader.GetMethodDefinition(method).Name) == "Patch"))
                    .Select(type => new TypeRef(type, reader)),

                _ => [],
            },

            BepInExPluginTypes: bepinex.Any(static a => a.Version?.Major == 5 || a.Version?.Major == 6)
                ? reader.TypeDefinitions
                    .Select(reader.GetTypeDefinition)
                    .Where(type => type.GetCustomAttributes()
                        .Any(attr => GetFullName(reader.GetCustomAttribute(attr), reader)?.StartsWith("BepInEx.BepInPlugin") ?? false))
                    .Select(type => new TypeRef(type, reader))
                : []
        );

        return JsonSerializer.Serialize(result);
    }
}
