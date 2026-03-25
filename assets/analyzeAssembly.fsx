(*
This Source Code Form is subject to the terms of the
Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
*)
open System
open System.IO
open System.Reflection.Metadata
open System.Reflection.PortableExecutable
open System.Text.Json

let args = fsi.CommandLineArgs |> Array.tail

let path =
    match args with
    | [| file |] when not (File.Exists file) ->
        eprintfn "file does not exist: %s" file
        exit 1

    | [| file |] -> file

    | _ ->
        eprintfn "expected 1 argument, received %d" args.Length
        exit 1

type TypeRef = { Namespace: string; Name: string }

let s (handle: StringHandle) (reader: MetadataReader) = reader.GetString handle

let name t =
    match t with
    | { Namespace = ns; Name = name } when ns.Length > 0 -> $"{ns}.{name}"
    | { Name = name } -> name

let fullName (attribute: CustomAttribute, reader: MetadataReader) =

    match attribute.Constructor.Kind with
    | HandleKind.MethodDefinition ->
        (reader.GetMethodDefinition(MethodDefinitionHandle.op_Explicit attribute.Constructor))
            .GetDeclaringType()
        |> reader.GetTypeDefinition
        |> (fun t ->
            { Namespace = s t.Namespace reader
              Name = s t.Name reader })
        |> name
        |> Some

    | HandleKind.MemberReference ->
        let ref =
            reader.GetMemberReference(MemberReferenceHandle.op_Explicit attribute.Constructor)

        match ref.Parent.Kind with
        | HandleKind.TypeReference ->
            reader.GetTypeReference(TypeReferenceHandle.op_Explicit ref.Parent)
            |> (fun t ->
                { Namespace = s t.Namespace reader
                  Name = s t.Name reader })
            |> name
            |> Some

        | HandleKind.TypeDefinition ->
            reader.GetTypeDefinition(TypeDefinitionHandle.op_Explicit ref.Parent)
            |> (fun t ->
                { Namespace = s t.Namespace reader
                  Name = s t.Name reader })
            |> name
            |> Some

        | _ -> None

    | _ -> None

let getBiePluginTypes (reader: MetadataReader) =
    reader.TypeDefinitions
    |> Seq.map reader.GetTypeDefinition
    |> Seq.filter (fun (t: TypeDefinition) ->
        t.GetCustomAttributes()
        |> Seq.exists (fun handle ->
            match fullName (reader.GetCustomAttribute handle, reader) with
            | Some str -> str.StartsWith "BepInEx.BepInPlugin"
            | _ -> false))
    |> Seq.map (fun t ->
        { Namespace = s t.Namespace reader
          Name = s t.Name reader })

let getBie5PatcherTypes (reader: MetadataReader) =
    reader.TypeDefinitions
    |> Seq.map reader.GetTypeDefinition
    |> Seq.filter (fun (t: TypeDefinition) ->
        t.GetProperties()
        |> Seq.exists (fun prop -> s (reader.GetPropertyDefinition prop).Name reader = "TargetDLLs")
        && t.GetMethods()
           |> Seq.exists (fun method -> s (reader.GetMethodDefinition method).Name reader = "Patch"))
    |> Seq.map (fun t ->
        { Namespace = s t.Namespace reader
          Name = s t.Name reader })

let getBie6PatcherTypes (reader: MetadataReader) =
    reader.TypeDefinitions
    |> Seq.map reader.GetTypeDefinition
    |> Seq.filter (fun (t: TypeDefinition) ->
        t.GetCustomAttributes()
        |> Seq.exists (fun handle ->
            match fullName (reader.GetCustomAttribute handle, reader) with
            | Some str -> str.StartsWith "BepInEx." && str.EndsWith ".PatcherPluginInfoAttribute"
            | _ -> false))
    |> Seq.map (fun t ->
        { Namespace = s t.Namespace reader
          Name = s t.Name reader })

let getAssemblyReferences (reader: MetadataReader) =
    reader.AssemblyReferences
    |> Seq.map (fun r -> (reader.GetAssemblyReference r).GetAssemblyName())

type AssemblyRef = { Name: string; Version: Version }

let getBepInExReferences (refs: AssemblyRef seq) =
    refs |> Seq.filter (fun { Name = name } -> name.StartsWith "BepInEx")

type output =
    { Assembly: AssemblyRef
      BepInExAssemblies: AssemblyRef seq
      BepInExPatcherTypes: TypeRef seq
      BepInExPluginTypes: TypeRef seq }

using (new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)) (fun fs ->
    using (new PEReader(fs)) (fun peReader ->
        let reader = peReader.GetMetadataReader()

        let def = reader.GetAssemblyDefinition()

        let references = getAssemblyReferences reader

        let refs =
            references
            |> Seq.map (fun ref ->
                { Name = ref.Name
                  Version = ref.Version })

        let bepinex = getBepInExReferences refs

        { Assembly =
            { Name = s def.Name reader
              Version = def.Version }

          BepInExAssemblies = bepinex

          BepInExPatcherTypes =
            match bepinex with
            | _ when bepinex |> Seq.exists (fun { Version = version } -> version.Major = 6) ->
                getBie6PatcherTypes reader

            | _ when bepinex |> Seq.exists (fun ref -> ref.Name = "BepInEx" && ref.Version.Major = 5) ->
                getBie5PatcherTypes reader

            | _ -> Seq.empty

          BepInExPluginTypes =
            match bepinex with
            | _ when
                bepinex
                |> Seq.exists (fun { Version = version } -> version.Major = 5 || version.Major = 6)
                ->
                getBiePluginTypes reader

            | _ -> Seq.empty }

        |> JsonSerializer.Serialize
        |> printf "%s"))
