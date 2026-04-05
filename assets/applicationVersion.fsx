(*
This Source Code Form is subject to the terms of the
Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
*)
#r "../DotNetUtils/bin/Release/AssetsTools.NET"

open AssetsTools.NET.Extra
open System.IO

let args = fsi.CommandLineArgs |> Array.tail

let gameDataPath, tpkPath =
    match args with
    | [| dir; _ |] when not (Directory.Exists dir) ->
        eprintfn "directory does not exist: %s" dir
        exit 1

    | [| _; file |] when not (File.Exists file) ->
        eprintfn "file does not exist: %s" file
        exit 1

    | [| dir; file |] -> dir, file

    | _ ->
        eprintfn "expected 2 arguments, received %d" args.Length
        exit 1

let manager = new AssetsManager()

let instance =
    try
        match gameDataPath with

        | path when (path, "globalgamemanagers") |> Path.Combine |> File.Exists ->
            ((path, "globalgamemanagers") |> Path.Combine, true) |> manager.LoadAssetsFile

        | path when (path, "mainData") |> Path.Combine |> File.Exists ->
            ((path, "mainData") |> Path.Combine, true) |> manager.LoadAssetsFile

        | path when (path, "data.unity3d") |> Path.Combine |> File.Exists ->
            ((path, "data.unity3d") |> Path.Combine |> manager.LoadBundleFile, "globalgamemanagers", true)
            |> manager.LoadAssetsFileFromBundle

        | _ ->
            eprintfn "could not load globalgamemanagers"
            exit 1
    with ex ->
        eprintfn "could not load globalgamemanagers:\n\t%s" ex.Message
        exit 1

try
    manager.LoadClassPackage tpkPath |> ignore

    if not instance.file.Metadata.TypeTreeEnabled then
        manager.LoadClassDatabaseFromPackage instance.file.Metadata.UnityVersion
        |> ignore
with ex ->
    eprintfn "could not load class data:\n\t%s" ex.Message
    exit 1

exception Error of string

try
    match
        (instance,
         instance.file.GetAssetsOfType AssetClassID.PlayerSettings
         |> Seq.toList
         |> List.head,
         AssetReadFlags.None)
        |> manager.GetBaseField
        |> Option.ofObj
    with
    | Some baseField ->
        match baseField.Get "bundleVersion" |> Option.ofObj with
        | Some version when version.TypeName = "string" -> version.AsString |> printf "%s"
        | _ -> raise (Error "could not parse bundle version")
    | _ -> raise (Error "could not get base field")

with ex ->
    let message =
        match ex with
        | Error str -> str
        | ex -> ex.Message

    eprintfn "could not parse player settings:\n\t%s" message
    exit 1
