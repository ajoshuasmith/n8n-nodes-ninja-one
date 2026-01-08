# n8n-nodes-ninja-one

[![npm version](https://img.shields.io/npm/v/@joshuanode/n8n-nodes-ninja-one.svg)](https://www.npmjs.com/package/@joshuanode/n8n-nodes-ninja-one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n](https://img.shields.io/badge/n8n-community%20node-orange.svg)](https://n8n.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GitHub](https://img.shields.io/badge/GitHub-repo-black.svg?logo=github)](https://github.com/ajoshuasmith/n8n-nodes-ninja-one)

This is an n8n community node for integrating with the [NinjaOne RMM](https://www.ninjaone.com/) API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

> Contributions are welcome! Please report any issues or submit pull requests on [GitHub](https://github.com/ajoshuasmith/n8n-nodes-ninja-one).

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

This node supports the following resources and operations:

### Organization

- **Create** - Create a new organization
- **Get** - Get a single organization
- **Get Many** - Get multiple organizations
- **Update** - Update an organization

### Device

- **Approve/Reject** - Approve or reject pending devices
- **Cancel Maintenance** - Cancel a scheduled maintenance window
- **Delete** - Delete a device (requires signed API agreement)
- **Get** - Get a single device
- **Get Activities** - Get device activity log
- **Get Alerts** - Get device alerts
- **Get Custom Fields** - Get device custom fields
- **Get Dashboard URL** - Get the NinjaOne dashboard URL for a device
- **Get Disks** - Get device disk information
- **Get Jobs** - Get active jobs for a device
- **Get Last Logged On User** - Get the last user who logged into the device
- **Get Many** - Get multiple devices (with optional organization filter)
- **Get OS Patch Installs** - Get OS patch installation history
- **Get OS Patches** - Get available OS patches
- **Get Policy Overrides** - Get policy overrides for a device
- **Get Processors** - Get device processor information
- **Get Scripting Options** - Get available scripting options for a device
- **Get Software** - Get installed software on a device
- **Get Software Patch Installs** - Get software patch installation history
- **Get Software Patches** - Get available software patches
- **Get Volumes** - Get device volume information
- **Reboot** - Reboot a device (Normal or Forced)
- **Reset Policy Overrides** - Reset policy overrides to default
- **Run Script** - Run a script on a device
- **Schedule Maintenance** - Schedule a maintenance window
- **Update** - Update device properties
- **Update Custom Fields** - Update device custom fields

### Location

- **Create** - Create a new location
- **Get Many** - Get locations for an organization
- **Update** - Update a location

### Alert

- **Get Many** - Get alerts with optional filters
- **Reset** - Reset/acknowledge an alert
- **Reset with Activity** - Reset an alert with activity data

### Group

- **Get Device IDs** - Get device IDs in a group
- **Get Many** - Get all groups

### Ticket

- **Add Comment** - Add a comment to a ticket
- **Create** - Create a new ticket
- **Get** - Get a single ticket
- **Get Log Entries** - Get ticket log entries
- **Update** - Update a ticket

### Webhook

- **Create** - Create a new webhook
- **Delete** - Delete a webhook

### Query

- **Get Activities** - Query activities across all devices
- **Get Alerts** - Query alerts across all devices
- **Get Software** - Query software inventory across all devices

### Windows Service

- **Get Many** - Get Windows services on a device
- **Start** - Start a Windows service
- **Stop** - Stop a Windows service

## Credentials

To use this node, you need to configure NinjaOne API credentials:

1. Log into your NinjaOne portal
2. Go to **Administration > Apps > API**
3. Create a new API application with Client Credentials grant type
4. Copy the Client ID and Client Secret
5. Select the appropriate scope (Monitoring, Management, or Control)

In n8n:

1. Go to **Credentials > Add Credential**
2. Select **NinjaOne API**
3. Enter your Client ID and Client Secret
4. Select your region (US, EU, or Oceania)
5. Choose the appropriate scope

### API Scopes

- **Monitoring** - Read-only access to data
- **Monitoring + Management** - Read/write access to data and settings
- **Monitoring + Management + Control** - Full access including device control operations

## Features

- **Resource Locator dropdowns** - Select organizations, devices, locations, groups, and scripts from searchable dropdown lists
- **Pagination support** - Use "Return All" to fetch all results or limit to a specific number
- **Expression support** - All fields support n8n expressions for dynamic values
- **Device filters** - Filter devices using NinjaOne's device filter query syntax
- **Rate limiting** - Built-in rate limiting with exponential backoff
- **Multi-region support** - US, EU, and Oceania API endpoints

## Delete Device Operation

The Delete Device operation requires a special agreement with NinjaOne. Contact your NinjaOne account manager to sign the digital signature agreement to enable this endpoint.

## Compatibility

- n8n version: 1.0+
- Node.js version: 18.17.0+

## Resources

- [NinjaOne API Documentation](https://app.ninjarmm.com/apidocs/)
- [NinjaOne API Specification](https://app.ninjarmm.com/apidocs/NinjaRMM-API-v2.json)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
