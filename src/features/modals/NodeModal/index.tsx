import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  Textarea,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import toast from "react-hot-toast";
import { FiEdit, FiSave, FiX } from "react-icons/fi";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setContents = useFile(state => state.setContents);

  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");

  React.useEffect(() => {
    setEditing(false);
    setEditValue(normalizeNodeData(nodeData?.text ?? []));
  }, [nodeData?.id]);

  const applyEditedValueToJson = (newValue: unknown) => {
    try {
      const contents = useFile.getState().contents;
      const root = JSON.parse(contents);

      const path = nodeData?.path ?? [];

      // if path is empty, replace root
      if (!path || path.length === 0) {
        const updated = newValue;
        const updatedStr = JSON.stringify(updated, null, 2);
        setContents({ contents: updatedStr, hasChanges: true });
        useJson.getState().setJson(updatedStr);
        return;
      }

      // traverse to parent of target
      let cur: any = root;
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i] as string | number;
        if (cur[key] === undefined) {
          // create object or array depending on next key
          const nextKey = path[i + 1];
          cur[key] = typeof nextKey === "number" ? [] : {};
        }
        cur = cur[key];
      }

      const lastKey = path[path.length - 1] as string | number;
      cur[lastKey] = newValue;

      const updatedStr = JSON.stringify(root, null, 2);
      setContents({ contents: updatedStr, hasChanges: true });
      useJson.getState().setJson(updatedStr);
    } catch (error) {
      throw error;
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editValue);
      applyEditedValueToJson(parsed);
      toast.success("Node updated");
      setEditing(false);
      onClose?.();
    } catch (err: any) {
      toast.error(err?.message || "Invalid JSON");
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Group>
              {!editing ? (
                <Button
                  size="xs"
                  leftSection={<FiEdit />}
                  variant="default"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="xs" leftSection={<FiSave />} color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<FiX />}
                    variant="default"
                    onClick={() => {
                      setEditing(false);
                      setEditValue(normalizeNodeData(nodeData?.text ?? []));
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={onClose} />
            </Group>
          </Flex>
          {editing ? (
            <Textarea
              value={editValue}
              onChange={e => setEditValue(e.currentTarget.value)}
              minRows={4}
              maxRows={20}
              autosize
              maw={600}
            />
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
