import { List, Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { DomainExtensions } from "./DomainExtensions";

// Define a structure for our list items
export interface DomainListItem {
  display: string;
  name: string;
}

// Define available commands for a domain
interface DomainCommand {
  title: string;
  description: string;
  icon: Icon;
  action: () => void;
}

// Component for showing domain commands
export function DomainCommandList({ domain }: { domain: DomainListItem }) {
  const { push } = useNavigation();

  const commands: DomainCommand[] = [
    {
      title: "View Extensions",
      description: "List all extensions for this domain",
      icon: Icon.List,
      action: () => {
        push(<DomainExtensions domain={domain} />);
      }
    }
  ];

  return (
    <List>
      {commands.map((command, index) => (
        <List.Item
          key={index}
          title={command.title}
          subtitle={command.description}
          icon={command.icon}
          actions={
            <ActionPanel>
              <Action
                title="Execute Command"
                onAction={command.action}
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                url={`https://${domain.name}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
} 