const fs = require("fs");
const path = require("path");

const taskFile = path.join(process.cwd(), "task.txt");
const completedFile = path.join(process.cwd(), "completed.txt");

const printInstruction = () => {
  process.stdout.write(`Usage :-
$ ./task add 2 hello world    # Add a new item with priority 2 and text "hello world" to the list
$ ./task ls                   # Show incomplete priority list items sorted by priority in ascending order
$ ./task del INDEX            # Delete the incomplete item with the given index
$ ./task done INDEX           # Mark the incomplete item with the given index as complete
$ ./task help                 # Show usage
$ ./task report               # Statistics\n`);
};

const parsePending = () => {
  try {
    const content = fs.readFileSync(taskFile).toString();
    let tasks = [];
    content.split(/\r?\n/).forEach((line) => {
      let match;
      if ((match = line.match(/^(\d+)\s(.*)$/))) {
        tasks.push({
          task: match[2],
          priority: parseInt(match[1]),
        });
      }
    });

    return tasks;
  } catch (err) {
    return [];
  }
};

const parseCompleted = () => {
  try {
    const content = fs.readFileSync(completedFile).toString();
    let tasks = [];
    content.split(/\r?\n/).forEach((line) => {
      let match;
      if ((match = line.match(/^(\w.*)$/))) {
        tasks.push({
          task: match[1],
        });
      }
    });

    return tasks;
  } catch (err) {
    return [];
  }
};

const parseFile = (type = "pending") => {
  const ops = {
    pending: parsePending,
    complete: parseCompleted,
  };
  return ops[type]();
};

const save = (list, ops, msg = "Marked item as done.\n") => {
  if (ops === "mark") {
    return fs.writeFile(
      completedFile,
      format(list, ops),
      { flag: "w+" },
      (err) => {
        if (err) return process.stdout.write(`Cannot ${ops} the item.`);
        process.stdout.write(msg);
      }
    );
  }
  fs.writeFile(taskFile, format(list), { flag: "w+" }, (err) => {
    if (err) return process.stdout.write(`Cannot ${ops} the item.`);
    process.stdout.write(msg);
  });
};

const sort = (list) => list.sort(({ priority: a }, { priority: b }) => a - b);

const format = (list, style = "write") => {
  const ops = {
    stats: (list) =>
      sort(list).reduce(
        (contents, { task }, i) => contents + `${i + 1}. ${task}\n`,
        ""
      ),
    list: (list) =>
      sort(list).reduce(
        (contents, item, i) =>
          contents + `${i + 1}. ${item.task} [${item.priority}]\n`,
        ""
      ) || "There are no pending tasks!\n",
    write: (list) =>
      sort(list).reduce(
        (contents, item) => contents + `${item.priority} ${item.task}\n`,
        ""
      ),
    mark: (list) =>
      list.reduce((contents, { task }) => contents + `${task}\n`, ""),
  };
  return ops[style](list);
};

const addItem = () => {
  const task = {};
  task.task = ""
    .concat(process.argv.filter((args, index) => index > 3))
    .replace(/,/g, " ");
  task.priority = parseInt(process.argv[3]);
  task.complete = false;
  if (isNaN(task.priority) || !task.task)
    return process.stdout.write(
      "Error: Missing tasks string. Nothing added!\n"
    );

  const taskList = parseFile();

  taskList.push(task);
  const msg = `Added task: "${task.task}" with priority ${task.priority}\n`;
  save(taskList, "add", msg);
};

const listItems = () => process.stdout.write(format(parseFile(), "list"));

const deleteItem = (index) => {
  const indexToDelete = index || parseInt(process.argv[3]);
  if (isNaN(indexToDelete))
    return process.stdout.write("Error: Missing NUMBER for deleting tasks.\n");

  const pendingTasks = parseFile();

  if (indexToDelete - 1 < 0 || indexToDelete > pendingTasks.length)
    return process.stdout.write(
      `Error: task with index #${indexToDelete} does not exist. Nothing deleted.\n`
    );

  pendingTasks.splice(indexToDelete - 1, 1);

  save(pendingTasks, "delete", index ? "" : `Deleted task #${indexToDelete}\n`);
};

const markItemDone = () => {
  const indexToMark = parseInt(process.argv[3]);
  if (isNaN(indexToMark))
    return process.stdout.write(
      "Error: Missing NUMBER for marking tasks as done.\n"
    );

  const pendingTasks = parseFile();
  const completedTasks = parseFile("complete");

  if (indexToMark - 1 < 0 || indexToMark > pendingTasks.length)
    return process.stdout.write(
      `Error: no incomplete item with index #${indexToMark} exists.\n`
    );

  deleteItem(indexToMark);
  completedTasks.push(pendingTasks[indexToMark - 1]);

  save(completedTasks, "mark");
};

const showStats = () => {
  const pendingTasks = parseFile();
  const completedTasks = parseFile("complete");

  process.stdout.write(`Pending : ${pendingTasks.length}\n`);
  process.stdout.write(format(pendingTasks, "list"));
  process.stdout.write(`\nCompleted : ${completedTasks.length}\n`);
  process.stdout.write(format(completedTasks, "stats"));
};

const action = {
  add: addItem,
  ls: listItems,
  del: deleteItem,
  done: markItemDone,
  help: printInstruction,
  report: showStats,
};

(function main() {
  const numberOfArguments = process.argv.length;
  if (numberOfArguments <= 2) printInstruction();
  else {
    const command = process.argv[2];
    action[command]();
  }
})();
