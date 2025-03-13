import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

interface Extension {
  id: number;
  name: string;
  first_name: string;
  display_name: string;
  dnd: boolean;
  email_address: string;
  alias: string[];
}

interface ExtensionsResponse {
  [key: string]: Extension;
}

interface Domain {
  name: string;
  display: string;
}

interface DomainsResponse {
  [key: string]: Domain;
}

interface Preferences {
  username: string;
  password: string;
  domain: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [extensions, setExtensions] = useState<Array<Extension & { domain: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchDomains() {
      try {
        const username = preferences.username;
        const password = preferences.password;
        const url = "https://" + preferences.domain + "/rest/system/domains";
        
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Encoding': 'identity'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          throw new Error('Empty response received from server');
        }

        const data = JSON.parse(text) as DomainsResponse;
        const domainList = Object.values(data);
        setDomains(domainList);

        // After getting domains, fetch extensions for each domain
        const allExtensions = await Promise.all(
          domainList.map(async (domain) => {
            const extUrl = `https://${preferences.domain}/rest/domain/${domain.name}/extensions`;
            const extResponse = await fetch(extUrl, {
              method: "GET",
              headers: {
                'Authorization': `Basic ${authString}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Accept-Encoding': 'identity'
              }
            });

            if (!extResponse.ok) {
              console.warn(`Failed to fetch extensions for domain ${domain.name}`);
              return [];
            }

            const extText = await extResponse.text();
            if (!extText) return [];

            const extData = JSON.parse(extText) as ExtensionsResponse;
            return Object.values(extData).map(ext => ({
              ...ext,
              domain: domain.name
            }));
          })
        );

        setExtensions(allExtensions.flat());
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setError(errorMessage);
        setExtensions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDomains();
  }, []);

  const filteredExtensions = extensions.filter(ext => {
    const searchLower = searchText.toLowerCase();
    return (
      ext.id.toString().includes(searchLower) ||
      ext.first_name.toLowerCase().includes(searchLower) ||
      ext.display_name.toLowerCase().includes(searchLower) ||
      ext.email_address.toLowerCase().includes(searchLower) ||
      (ext.alias || []).some(alias => alias.toLowerCase().includes(searchLower))
    );
  });

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.Item
          title={`Error: ${error}`}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search extensions by name, ID, or email..."
    >
      {filteredExtensions.map((ext, index) => (
        <List.Item
          key={index}
          title={ext.first_name + " " + ext.display_name}
          subtitle={`Ext. ${ext.id}`}
          accessories={[
            { text: ext.domain },
            { text: ext.email_address },
            ...(ext.alias?.length > 1 ? [{ text: ext.alias.slice(1).join(", ") }] : [])
          ]}
          icon={ext.dnd === true ? Icon.CircleFilled : Icon.Circle}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Extension ID"
                content={ext.id.toString()}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Email"
                content={ext.email_address}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Domain"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                url={`https://${ext.domain}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
} 