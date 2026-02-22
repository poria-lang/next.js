import type { API, FileInfo } from 'jscodeshift'
import { createParserFromPath } from '../lib/parser'

export default function transformer(file: FileInfo, _api: API) {
  const j = createParserFromPath(file.path)
  const root = j(file.source)

  // Find the metadata object
  let metadataObjectPath: any
  root.find(j.VariableDeclarator, { id: { name: 'metadata' } }).forEach((path) => {
    if (path.value.init && path.value.init.type === 'ObjectExpression') {
      metadataObjectPath = path.get('init')
    }
  })

  if (!metadataObjectPath) {
    return file.source
  }

  const metadataObject = metadataObjectPath.node
  let metadataProperties = metadataObject.properties
  let viewportProperties: any[] = []
  let hasChanges = false

  const getPropKeyName = (prop: any) => {
    if (!prop.key) return null
    if (prop.key.type === 'Identifier') return prop.key.name
    if (prop.key.type === 'Literal' || prop.key.type === 'StringLiteral')
      return prop.key.value
    return null
  }

  const viewportProp = metadataProperties.find(
    (prop: any) => getPropKeyName(prop) === 'viewport'
  )
  if (viewportProp && viewportProp.type === 'ObjectProperty' && viewportProp.value.type === 'ObjectExpression') {
    viewportProperties = viewportProp.value.properties
    metadataProperties = metadataProperties.filter(
      (prop) => getPropKeyName(prop) !== 'viewport'
    )
    hasChanges = true
  }

  const colorSchemeProp = metadataProperties.find(
    (prop: any) => getPropKeyName(prop) === 'colorScheme'
  )
  if (colorSchemeProp) {
    viewportProperties.push(colorSchemeProp)
    metadataProperties = metadataProperties.filter(
      (prop) => getPropKeyName(prop) !== 'colorScheme'
    )
    hasChanges = true
  }

  const themeColorProp = metadataProperties.find(
    (prop: any) => getPropKeyName(prop) === 'themeColor'
  )
  if (themeColorProp) {
    viewportProperties.push(themeColorProp)
    metadataProperties = metadataProperties.filter(
      (prop) => getPropKeyName(prop) !== 'themeColor'
    )
    hasChanges = true
  }

  // Only apply changes if there were actual modifications
  if (!hasChanges) {
    return file.source
  }

  // Update the metadata object
  j(metadataObjectPath).replaceWith(j.objectExpression(metadataProperties))

  // Create the new viewport object
  const viewportExport = j.exportNamedDeclaration(
    j.variableDeclaration('const', [
      j.variableDeclarator(
        j.identifier('viewport'),
        j.objectExpression(viewportProperties)
      ),
    ])
  )

  // Append the viewport export to the body of the program
  if (viewportProperties.length) {
    root.get().node.program.body.push(viewportExport)
  }

  return root.toSource()
}
