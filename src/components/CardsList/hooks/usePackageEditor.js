import { useEffect, useRef, useState } from 'react';
import { updatePackage } from '../../../services/flashcardService';

export default function usePackageEditor({
  user,
  packageItem,
  onPackageUpdated,
  setError,
}) {
  const [packageName, setPackageName] = useState(packageItem?.name || '');
  const [packageDescription, setPackageDescription] = useState(
    packageItem?.description || ''
  );
  const [debouncedPackageName, setDebouncedPackageName] = useState(
    packageItem?.name || ''
  );
  const [debouncedPackageDescription, setDebouncedPackageDescription] =
    useState(packageItem?.description || '');

  const [isEditingName, setIsEditingName] = useState(false);
  const [draftPackageName, setDraftPackageName] = useState(
    packageItem?.name || ''
  );
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [packageTouched, setPackageTouched] = useState(false);
  const [nameError, setNameError] = useState('');

  const headerNameInputRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const packageItemRef = useRef(packageItem);
  const onPackageUpdatedRef = useRef(onPackageUpdated);
  const lastSavedPackageRef = useRef({
    name: packageItem?.name || '',
    description: packageItem?.description || '',
  });

  useEffect(() => {
    packageItemRef.current = packageItem;
  }, [packageItem]);

  useEffect(() => {
    onPackageUpdatedRef.current = onPackageUpdated;
  }, [onPackageUpdated]);

  useEffect(() => {
    setPackageName(packageItem?.name || '');
    setPackageDescription(packageItem?.description || '');
    setDebouncedPackageName(packageItem?.name || '');
    setDebouncedPackageDescription(packageItem?.description || '');
    setDraftPackageName(packageItem?.name || '');
    setIsEditingName(false);
    setIsAutoSaving(false);
    setPackageTouched(false);
    setNameError('');

    lastSavedPackageRef.current = {
      name: packageItem?.name || '',
      description: packageItem?.description || '',
    };

    initialSyncDoneRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const raf = requestAnimationFrame(() => {
      initialSyncDoneRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [packageItem?.id]);

  useEffect(() => {
    if (!packageTouched) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedPackageName(packageName);
      setDebouncedPackageDescription(packageDescription);
    }, 700);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [packageName, packageDescription, packageTouched]);

  useEffect(() => {
    if (!user || !packageItem?.id) return;
    if (!initialSyncDoneRef.current) return;
    if (!packageTouched) return;

    const lastSaved = lastSavedPackageRef.current;
    if (
      debouncedPackageName === lastSaved.name &&
      debouncedPackageDescription === lastSaved.description
    ) {
      return;
    }

    let cancelled = false;

    const autoSavePackage = async () => {
      try {
        setIsAutoSaving(true);
        setError?.('');

        await updatePackage(
          user.uid,
          packageItem.id,
          debouncedPackageName,
          debouncedPackageDescription
        );

        if (cancelled) return;

        lastSavedPackageRef.current = {
          name: debouncedPackageName,
          description: debouncedPackageDescription,
        };

        onPackageUpdatedRef.current?.({
          ...packageItemRef.current,
          name: debouncedPackageName,
          description: debouncedPackageDescription,
        });

        if (debouncedPackageName.trim()) {
          setNameError('');
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError?.('Lỗi tự động lưu tên gói');
        }
      } finally {
        if (!cancelled) {
          setIsAutoSaving(false);
        }
      }
    };

    autoSavePackage();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedPackageName,
    debouncedPackageDescription,
    packageTouched,
    user,
    packageItem?.id,
    setError,
  ]);

  useEffect(() => {
    if (!isEditingName) return;

    const raf = requestAnimationFrame(() => {
      headerNameInputRef.current?.focus();
      headerNameInputRef.current?.select();
    });

    return () => cancelAnimationFrame(raf);
  }, [isEditingName]);

  const openNameEditor = () => {
    setDraftPackageName(packageName || '');
    setIsEditingName(true);
    setNameError('');
  };

  const saveHeaderName = () => {
    const nextName = draftPackageName.trim();
    setPackageName(nextName);
    setPackageTouched(true);

    if (nextName) {
      setNameError('');
    }

    setIsEditingName(false);
  };

  const cancelHeaderNameEdit = () => {
    setDraftPackageName(packageName || '');
    setIsEditingName(false);
  };

  const handleHeaderNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveHeaderName();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelHeaderNameEdit();
    }
  };

  const ensurePackageName = (message) => {
    if (packageName.trim()) return true;

    setNameError(message);
    setDraftPackageName(packageName || '');
    setIsEditingName(true);
    return false;
  };

  const handleDescriptionChange = (e) => {
    setPackageDescription(e.target.value);
    setPackageTouched(true);
  };

  const syncSavedPackageSnapshot = ({
    name = packageName,
    description = packageDescription,
  } = {}) => {
    lastSavedPackageRef.current = {
      name,
      description,
    };
  };

  return {
    packageName,
    packageDescription,
    isEditingName,
    draftPackageName,
    isAutoSaving,
    nameError,
    headerNameInputRef,
    setDraftPackageName,
    openNameEditor,
    saveHeaderName,
    cancelHeaderNameEdit,
    handleHeaderNameKeyDown,
    handleDescriptionChange,
    ensurePackageName,
    syncSavedPackageSnapshot,
  };
}