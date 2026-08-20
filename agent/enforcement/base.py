import abc

class BaseEnforcer(abc.ABC):
    @abc.abstractmethod
    def lock_session(self):
        pass

    @abc.abstractmethod
    def unlock_session(self):
        pass

    @abc.abstractmethod
    def block_network(self):
        pass

    @abc.abstractmethod
    def unblock_network(self):
        pass
